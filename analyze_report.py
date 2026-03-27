import json

r = json.load(open(r"C:\Users\agafoor\Projects\MigrationLens\report_output.json"))

repo = r["repository"]
print(f"Repo: {repo['name']} | .NET: {r['dotnet_version_current']} -> {r['dotnet_version_target']}")
print(f"Score: {r['overall_score']}% | Steps: {r['total_steps']} (Crit:{r['critical_steps']} High:{r['high_steps']} Med:{r['medium_steps']} Low:{r['low_steps']})")
print(f"Pass:{r['passing_rules']} Fail:{r['failing_rules']}")
print()

wiki_standards = r["wiki_standards"]
print(f"=== WIKI STANDARDS: {len(wiki_standards)} ===")
for ws in wiki_standards:
    rules = ", ".join(ws["related_rules"])
    print(f"  [{rules}] {ws['title']} ({ws['wiki_name']})")
print()

steps = r["steps"]
with_wiki = [s for s in steps if s.get("wiki_reference")]
print(f"=== STEPS WITH WIKI REFS: {len(with_wiki)}/{len(steps)} ===")
for s in with_wiki[:8]:
    ref = s["wiki_reference"][:100]
    print(f"  #{s['step_number']} [{s['severity']}] {s['rule_name']} -> {ref}...")
print()

print("=== CATEGORIES SUMMARY ===")
for cat in r.get("categories_summary", []):
    print(f"  {cat['category']}: {cat['score']}%")
