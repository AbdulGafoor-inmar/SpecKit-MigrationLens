"""Fetch key wiki pages and extract actionable standards not in compliance rules."""
import asyncio
import json
import re
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

# Key wiki pages to analyze for standards
PAGES_TO_FETCH = [
    "/Finance IT/Code and Development Guidelines/Coding Standards",
    "/Finance IT/Code and Development Guidelines/Docker best practices and sample Dockerfiles",
    "/Finance IT/Code and Development Guidelines/HealthCheck Standard",
    "/Finance IT/Code and Development Guidelines/CQRS - Coding Standards and Best Practices",
    "/Finance IT/Code and Development Guidelines/Azure build pipeline best practices",
    "/Finance IT/Code and Development Guidelines/Integration Testing Best Practices",
    "/Finance IT/Code and Development Guidelines/Entity Framework Bulk Operations",
    "/Finance IT/Code and Development Guidelines/Auth0",
    "/Finance IT/Code and Development Guidelines/Code Review Process",
    "/Finance IT/Code and Development Guidelines/Branching",
]

async def main():
    async with httpx.AsyncClient(timeout=30) as c:
        for page_path in PAGES_TO_FETCH:
            url = f"https://dev.azure.com/{org}/{project}/_apis/wiki/wikis/{wiki_id}/pages"
            try:
                r = await c.get(url, headers=headers, params={
                    "path": page_path,
                    "includeContent": "true",
                    "api-version": "7.1"
                })
                if r.status_code != 200:
                    print(f"\n=== SKIP: {page_path} (HTTP {r.status_code}) ===")
                    continue
                data = r.json()
                content = data.get("content", "")
                title = page_path.split("/")[-1]
                print(f"\n{'='*80}")
                print(f"PAGE: {title}")
                print(f"Path: {page_path}")
                print(f"Content Length: {len(content)} chars")
                print(f"{'='*80}")
                # Print first 3000 chars to understand the standards
                print(content[:3000])
                if len(content) > 3000:
                    print(f"\n... [{len(content)-3000} more chars] ...")
            except Exception as e:
                print(f"\n=== ERROR: {page_path}: {e} ===")

asyncio.run(main())
