import hashlib

with open("C://Users/asmi2/DownloadsVRapp(2).zip", "rb") as f:
    digest = hashlib.sha256(f.read()).hexdigest()
print(digest)