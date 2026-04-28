import http from 'k6/http';
import { check, group, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';

const API_BASE_URL = __ENV.K6_API_BASE_URL || 'http://127.0.0.1:8000';
const WEB_BASE_URL = __ENV.K6_WEB_BASE_URL || '';
const ADMIN_USERNAME = __ENV.K6_ADMIN_USERNAME;
const ADMIN_PASSWORD = __ENV.K6_ADMIN_PASSWORD;
const FREE_TIER_DB = (__ENV.K6_FREE_TIER_DB || 'true').toLowerCase() !== 'false';
const TEST_USER_PASSWORD = __ENV.K6_TEST_USER_PASSWORD || 'PerfPass123!';
const TEST_USER_COUNT = Number(__ENV.K6_TEST_USER_COUNT || (FREE_TIER_DB ? 10 : 20));
const LOGIN_VUS = Number(__ENV.K6_LOGIN_VUS || Math.min(TEST_USER_COUNT, FREE_TIER_DB ? 8 : 20));
const API_VUS = Number(__ENV.K6_API_VUS || Math.min(TEST_USER_COUNT, FREE_TIER_DB ? 5 : 10));
const WEB_VUS = Number(__ENV.K6_WEB_VUS || (FREE_TIER_DB ? 2 : 5));
const LOGIN_DURATION = __ENV.K6_LOGIN_DURATION || (FREE_TIER_DB ? '20s' : '30s');
const API_DURATION = __ENV.K6_API_DURATION || (FREE_TIER_DB ? '45s' : '1m');
const WEB_DURATION = __ENV.K6_WEB_DURATION || (FREE_TIER_DB ? '20s' : '30s');
const LOGIN_SLEEP_SECONDS = Number(__ENV.K6_LOGIN_SLEEP_SECONDS || (FREE_TIER_DB ? 2 : 1));
const API_SLEEP_SECONDS = Number(__ENV.K6_API_SLEEP_SECONDS || (FREE_TIER_DB ? 2 : 1));
const WEB_SLEEP_SECONDS = Number(__ENV.K6_WEB_SLEEP_SECONDS || (FREE_TIER_DB ? 2 : 1));

const requestSuccessRate = new Rate('request_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const endpointDuration = new Trend('endpoint_duration', true);
const bootstrapCounter = new Counter('bootstrap_actions');

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('K6_ADMIN_USERNAME and K6_ADMIN_PASSWORD are required.');
}

export const options = {
  scenarios: {
    ...(FREE_TIER_DB
      ? {
          login_burst: {
            executor: 'ramping-vus',
            exec: 'loginScenario',
            startVUs: 1,
            stages: [
              { duration: '10s', target: Math.max(1, Math.ceil(LOGIN_VUS / 2)) },
              { duration: LOGIN_DURATION, target: LOGIN_VUS },
              { duration: '10s', target: 0 },
            ],
            gracefulRampDown: '10s',
            gracefulStop: '5s',
          },
          key_api_endpoints: {
            executor: 'ramping-vus',
            exec: 'apiScenario',
            startVUs: 1,
            stages: [
              { duration: '10s', target: Math.max(1, Math.ceil(API_VUS / 2)) },
              { duration: API_DURATION, target: API_VUS },
              { duration: '10s', target: 0 },
            ],
            gracefulRampDown: '10s',
            gracefulStop: '5s',
            startTime: '10s',
          },
        }
      : {
          login_burst: {
            executor: 'constant-vus',
            exec: 'loginScenario',
            vus: LOGIN_VUS,
            duration: LOGIN_DURATION,
            gracefulStop: '5s',
          },
          key_api_endpoints: {
            executor: 'constant-vus',
            exec: 'apiScenario',
            vus: API_VUS,
            duration: API_DURATION,
            gracefulStop: '5s',
            startTime: '5s',
          },
        }),
    ...(WEB_BASE_URL
      ? {
          website_pages: {
            executor: FREE_TIER_DB ? 'ramping-vus' : 'constant-vus',
            exec: 'websiteScenario',
            ...(FREE_TIER_DB
              ? {
                  startVUs: 1,
                  stages: [
                    { duration: '5s', target: WEB_VUS },
                    { duration: WEB_DURATION, target: WEB_VUS },
                    { duration: '5s', target: 0 },
                  ],
                  gracefulRampDown: '5s',
                }
              : {
                  vus: WEB_VUS,
                  duration: WEB_DURATION,
                }),
            gracefulStop: '5s',
            startTime: FREE_TIER_DB ? '20s' : '10s',
          },
        }
      : {}),
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95'],
    request_success_rate: ['rate>0.95'],
    login_success_rate: ['rate>0.95'],
    'http_req_duration{type:login}': ['p(95)<1000'],
    'http_req_duration{type:api}': ['p(95)<1500'],
    'http_req_duration{type:web}': ['p(95)<1200'],
  },
};

function requestParams(token, type) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers, tags: { type } };
}

function jsonRequestParams(token, type) {
  const params = requestParams(token, type);
  return {
    ...params,
    headers: {
      ...params.headers,
      'Content-Type': 'application/json',
    },
  };
}

function formRequestParams(type) {
  return {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    tags: { type },
  };
}

function recordResult(response, ok, metricName) {
  requestSuccessRate.add(ok);
  if (metricName === 'login') loginSuccessRate.add(ok);
  endpointDuration.add(response.timings.duration, { endpoint: metricName });
}

function login(username, password) {
  const response = http.post(
    `${API_BASE_URL}/auth/token`,
    { username, password },
    formRequestParams('login')
  );

  const ok = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => !!r.json('access_token'),
  });

  recordResult(response, ok, 'login');
  return ok ? response.json('access_token') : null;
}

function createModule(adminToken, moduleName, version) {
  const response = http.post(
    `${API_BASE_URL}/modules`,
    JSON.stringify({
      module_name: moduleName,
      version,
      description: 'k6 performance test module',
    }),
    jsonRequestParams(adminToken, 'setup')
  );

  check(response, { 'module created': (r) => r.status === 200 });
  bootstrapCounter.add(1);
  return response.json('module_id');
}

function createScenario(adminToken, moduleId, name, scenarioIndex) {
  const response = http.post(
    `${API_BASE_URL}/modules/${moduleId}/scenarios`,
    JSON.stringify({
      name,
      module_id: moduleId,
      scenario_index: scenarioIndex,
    }),
    jsonRequestParams(adminToken, 'setup')
  );

  check(response, { 'scenario created': (r) => r.status === 200 });
  bootstrapCounter.add(1);
}

function registerUser(adminToken, username, email) {
  const response = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify({
      username,
      email,
      password: TEST_USER_PASSWORD,
      role: 'USER',
    }),
    jsonRequestParams(adminToken, 'setup')
  );

  const ok = check(response, { 'user created': (r) => r.status === 200 });
  if (!ok) {
    throw new Error(`Failed to create test user ${username}: ${response.status} ${response.body}`);
  }

  bootstrapCounter.add(1);
  return response.json('user_id');
}

function assignModule(adminToken, userId, moduleId) {
  const response = http.post(
    `${API_BASE_URL}/admin/assign?user_id=${encodeURIComponent(userId)}&module_id=${encodeURIComponent(moduleId)}`,
    null,
    requestParams(adminToken, 'setup')
  );

  check(response, { 'module assigned': (r) => r.status === 200 });
  bootstrapCounter.add(1);
}

function pickUser(data) {
  const index = (exec.vu.idInTest - 1) % data.users.length;
  return data.users[index];
}

export function setup() {
  const adminToken = login(ADMIN_USERNAME, ADMIN_PASSWORD);
  if (!adminToken) throw new Error('Admin login failed during setup.');

  const runId = Date.now().toString();
  const moduleId = createModule(adminToken, `Perf Module ${runId}`, '1.0.0');

  createScenario(adminToken, moduleId, 'Scenario 0', 0);
  createScenario(adminToken, moduleId, 'Scenario 1', 1);

  const users = [];
  for (let i = 0; i < TEST_USER_COUNT; i += 1) {
    const username = `perf_${runId}_${i}`;
    const email = `perf_${runId}_${i}@example.com`;
    const userId = registerUser(adminToken, username, email);
    assignModule(adminToken, userId, moduleId);
    users.push({ username, password: TEST_USER_PASSWORD });

    if (FREE_TIER_DB) sleep(0.2);
  }

  return { moduleId, users, webBaseUrl: WEB_BASE_URL };
}

export function loginScenario(data) {
  const user = pickUser(data);

  group('concurrent login', () => {
    const token = login(user.username, user.password);
    check(token, {
      'token issued': (value) => !!value,
    });
  });

  sleep(LOGIN_SLEEP_SECONDS);
}

export function apiScenario(data) {
  const user = pickUser(data);
  const token = login(user.username, user.password);
  if (!token) return;

  group('key api endpoints', () => {
    const meRes = http.get(`${API_BASE_URL}/users/me/`, requestParams(token, 'api'));
    const meOk = check(meRes, {
      'GET /users/me 200': (r) => r.status === 200,
    });
    recordResult(meRes, meOk, 'users_me');

    const modulesRes = http.get(`${API_BASE_URL}/modules`, requestParams(token, 'api'));
    const modulesOk = check(modulesRes, {
      'GET /modules 200': (r) => r.status === 200,
      'GET /modules returns array': (r) => Array.isArray(r.json()),
    });
    recordResult(modulesRes, modulesOk, 'modules');

    const launchRes = http.post(
      `${API_BASE_URL}/launch-module`,
      JSON.stringify({ module_id: data.moduleId }),
      jsonRequestParams(token, 'api')
    );
    const launchOk = check(launchRes, {
      'POST /launch-module 200': (r) => r.status === 200,
      'launch returns session_token': (r) => !!r.json('session_token'),
      'launch returns scenario_id': (r) => !!r.json('scenario_id'),
    });
    recordResult(launchRes, launchOk, 'launch_module');

    if (launchOk) {
      const sessionToken = launchRes.json('session_token');
      const scenarioId = launchRes.json('scenario_id');

      const progressRes = http.post(
        `${API_BASE_URL}/api/sessions/${sessionToken}/progress`,
        JSON.stringify({
          scenario_id: scenarioId,
          scenario_index: 0,
          status: 'completed',
          score_delta: 10,
        }),
        jsonRequestParams(token, 'api')
      );
      const progressOk = check(progressRes, {
        'POST progress 200': (r) => r.status === 200,
      });
      recordResult(progressRes, progressOk, 'progress');
    }
  });

  sleep(API_SLEEP_SECONDS);
}

export function websiteScenario(data) {
  if (!data.webBaseUrl) return;

  group('website pages', () => {
    const pageRes = http.get(`${data.webBaseUrl}/`, { tags: { type: 'web' } });
    const pageOk = check(pageRes, {
      'frontend root 200': (r) => r.status === 200,
    });
    recordResult(pageRes, pageOk, 'frontend_root');
  });

  sleep(WEB_SLEEP_SECONDS);
}
