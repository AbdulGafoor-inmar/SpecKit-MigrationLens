"""Fetch AKS, chiseled Docker, and additional wiki pages."""
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

# First, list all pages and search for AKS/kubernetes/chiseled/migration
async def main():
    async with httpx.AsyncClient(timeout=30) as c:
        # List all wiki pages
        url = f"https://dev.azure.com/{org}/{project}/_apis/wiki/wikis/{wiki_id}/pages"
        r = await c.get(url, headers=headers, params={
            "recursionLevel": "full",
            "api-version": "7.1"
        })
        data = r.json()

        # Flatten and find relevant pages
        all_pages = []
        def flatten(node, depth=0):
            path = node.get("path", "/")
            all_pages.append(path)
            for sub in node.get("subPages", []):
                flatten(sub, depth+1)
        flatten(data)

        # Search for AKS, kubernetes, chiseled, migration, custom image pages
        keywords = ["aks", "kubernetes", "k8s", "chiseled", "migration",
                     "custom", "base image", "container", "deploy",
                     "ingress", "helm", "acr cache", "serilog", "polly",
                     "exception", "middleware", "api versioning", "swagger"]
        found = set()
        for p in all_pages:
            pl = p.lower()
            for kw in keywords:
                if kw in pl:
                    found.add(p)
                    break

        print(f"Found {len(found)} relevant pages out of {len(all_pages)} total:\n")
        for p in sorted(found):
            print(f"  {p}")

        # Fetch specific AKS and Docker pages
        PAGES = [p for p in sorted(found)]
        for page_path in PAGES[:20]:
            try:
                r2 = await c.get(url, headers=headers, params={
                    "path": page_path,
                    "includeContent": "true",
                    "api-version": "7.1"
                })
                if r2.status_code != 200:
                    continue
                content = r2.json().get("content", "")
                title = page_path.split("/")[-1]
                print(f"\n{'='*80}")
                print(f"PAGE: {title}")
                print(f"Path: {page_path}")
                print(f"{'='*80}")
                print(content[:2500])
                if len(content) > 2500:
                    print(f"\n... [{len(content)-2500} more chars] ...")
            except Exception as e:
                print(f"ERROR: {page_path}: {e}")

asyncio.run(main())
