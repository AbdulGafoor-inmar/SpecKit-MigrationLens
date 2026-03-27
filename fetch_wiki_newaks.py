"""Fetch new AKS migration and custom base image pages."""
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
    "/Finance IT/Code and Development Guidelines/Kubernetes Best practices - New AKS",
    "/Resources/Azure Cloud/Azure Container Registry(ACR)/Custom dotnet base images (sdk, runtime, aspnet)",
    "/Resources/Azure Cloud/Azure Kubernetes Services (AKS) Cluster/Migration process to New AKS cluster",
    "/Resources/Azure Cloud/Azure Kubernetes Services (AKS) Cluster/Migration process to New AKS cluster/api-deployment.yaml",
    "/Resources/Azure Cloud/Azure Kubernetes Services (AKS) Cluster/Migration process to New AKS cluster/Deploy.sh",
    "/Resources/Azure Cloud/Azure Kubernetes Services (AKS) Cluster/Migration process to New AKS cluster/azure-pipelines.yml",
    "/Resources/Azure Cloud/Azure Kubernetes Services (AKS) Cluster/Migration process to New AKS cluster/Cronjob.yaml",
    "/Resources/Azure Cloud/Azure Kubernetes Services (AKS) Cluster/Migration process to New AKS cluster/deploy-api.sh",
    "/Resources/Azure Cloud/Azure Kubernetes Services (AKS) Cluster/Migration process to New AKS cluster/swapIngress.sh",
    "/Resources/Azure Cloud/Azure Container Registry(ACR)/Custom ACI Runner image on the ACR",
]

async def main():
    async with httpx.AsyncClient(timeout=30) as c:
        url = f"https://dev.azure.com/{org}/{project}/_apis/wiki/wikis/{wiki_id}/pages"
        for page_path in PAGES:
            try:
                r = await c.get(url, headers=headers, params={
                    "path": page_path, "includeContent": "true", "api-version": "7.1"
                })
                if r.status_code != 200:
                    print(f"\nSKIP: {page_path} (HTTP {r.status_code})")
                    continue
                content = r.json().get("content", "")
                title = page_path.split("/")[-1]
                print(f"\n{'='*80}")
                print(f"PAGE: {title}")
                print(f"Path: {page_path}")
                print(f"Content Length: {len(content)}")
                print(f"{'='*80}")
                print(content[:4000])
                if len(content) > 4000:
                    print(f"\n... [{len(content)-4000} more chars] ...")
            except Exception as e:
                print(f"ERROR: {page_path}: {e}")

asyncio.run(main())
