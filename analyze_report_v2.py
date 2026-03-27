import json

r = json.load(open(r"C:\Users\agafoor\Projects\MigrationLens\report_v2.json"))

repo = r["repository"]
print(f"Repo: {repo['name']} | .NET: {r['dotnet_version_current']} -> {r['dotnet_version_target']}")
print(f"Score: {r['overall_score']}%")
print(f"Steps: {r['total_steps']} failing (Crit:{r['critical_steps']} High:{r['high_steps']} Med:{r['medium_steps']} Low:{r['low_steps']})")
print(f"Pass: {r['passing_rules']} | Fail: {r['failing_rules']}")
print()

print("=== CATEGORIES ===")
for cat in r.get("categories_summary", []):
    print(f"  {cat['category']}: {cat['score']}% ({cat['passed']}/{cat['passed']+cat['failed']} passed)")
print()

steps = r["steps"]
fail_steps = [s for s in steps if s["status"] == "fail"]
wiki_steps = [s for s in fail_steps if s.get("wiki_source")]
print(f"=== FAILING STEPS: {len(fail_steps)} ===")
for s in fail_steps:
    ws = f" [Wiki: {s['wiki_source']}]" if s.get("wiki_source") else ""
    wr = " +wiki_ref" if s.get("wiki_reference") else ""
    print(f"  #{s['step_number']} [{s['severity']}] {s['rule_id']} {s['rule_name']}{ws}{wr}")
    if s['file_path']:
        print(f"    File: {s['file_path']}{' L'+str(s['line_number']) if s.get('line_number') else ''}")
    if s['suggested_fix']:
        print(f"    Fix: {s['suggested_fix'][:80]}...")
print()

print(f"=== WIKI-SOURCED RULES: {len(wiki_steps)}/{len(fail_steps)} failing ===")
print()

ws_list = r["wiki_standards"]
print(f"=== WIKI STANDARDS: {len(ws_list)} ===")
for ws in ws_list:
    lines = ws["content_summary"].split("\n")
    action_count = sum(1 for l in lines if l.strip().startswith("•"))
    print(f"  {ws['title']} ({ws['wiki_name']}) - {action_count} action items")
    for line in lines:
        if line.strip().startswith("•"):
            print(f"    {line.strip()}")
