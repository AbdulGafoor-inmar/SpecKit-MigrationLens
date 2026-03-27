"""Fetch AKS/Kubernetes specific wiki pages."""
import asyncio
import os
import base64
import httpx
from dotenv import load_dotenv

load_dotenv(r"C:\Users\agafoor\Projects\MigrationLens\backend\.env")
pat = os.getenv("ADO_PAT", "")
org = os.getenv("ADO_ORGANIZATION", "inmar")
token = base64.b64encode(f":{pat}".encode()).decode()
headers = {"Authorization": f"Basic {token}"}
wiki_id = "65fc2eb0-7cc9-4068-8560-cf788f4c6d8f"
project = "Finance"

PAGES = [
    "/Finance IT/Code and Development Guidelines/Docker best practices and sample Dockerfiles/Custom dotnet base images (sdk, runtime, aspnet)",
    "/Finance IT/Code and Development Guidelines/Docker best practices and sample Dockerfiles/Use the ACR cache",
    "/Finance IT/Code and Development Guidelines/Docker best practices and sample Dockerfiles/How to setup your own dev container on AKS",
    "/Finance IT/Kubernetes Best practices",
    "/Finance IT/Code and Development Guidelines/AKS",
]

async def main():
    async with httpx.AsyncClient(timeout=30) as c:
        url = f"https://dev.azure.com/{org}/{project}/_apis/wiki/wikis/{wiki_id}/pages"

        # Also search broadly for any page containing "aks" or "kubernetes" or "chiseled"
        r = await c.get(url, headers=headers, params={"recursionLevel": "full", "api-version": "7.1"})
        data = r.json()
        all_pages = []
        def flatten(node):
            all_pages.append(node.get("path", "/"))
            for sub in node.get("subPages", []):
                flatten(sub)
        flatten(data)

        aks_pages = [p for p in all_pages if any(kw in p.lower() for kw in ["aks", "kubernetes", "k8s", "chiseled", "custom dotnet", "acr", "helm", "deployment.yaml", "deploy.sh", "ingress"])]
        print("=== AKS/K8s/Chiseled related pages ===")
        for p in sorted(aks_pages):
            print(f"  {p}")

        # Fetch the key pages
        for page_path in PAGES + aks_pages[:10]:
            try:
                r2 = await c.get(url, headers=headers, params={
                    "path": page_path, "includeContent": "true", "api-version": "7.1"
                })
                if r2.status_code != 200:
                    print(f"\nSKIP: {page_path} (HTTP {r2.status_code})")
                    continue
                content = r2.json().get("content", "")
                if not content:
                    continue
                title = page_path.split("/")[-1]
                print(f"\n{'='*80}")
                print(f"PAGE: {title}")
                print(f"Path: {page_path}")
                print(f"{'='*80}")
                print(content[:3000])
                if len(content) > 3000:
                    print(f"\n... [{len(content)-3000} more chars] ...")
            except Exception as e:
                print(f"ERROR: {page_path}: {e}")

asyncio.run(main())
