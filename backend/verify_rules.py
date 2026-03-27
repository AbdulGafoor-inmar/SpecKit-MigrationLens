from app.services.compliance import ComplianceEngine
e = ComplianceEngine()
cats = e._rules
total = sum(len(c.get("rules", [])) for c in cats)
print(f"Categories: {len(cats)}")
for c in cats:
    rules = c.get("rules", [])
    print(f"  {c['name']}: {len(rules)} rules")
    for r in rules:
        ws = r.get("wiki_source", "")
        tag = f" [Wiki: {ws}]" if ws else ""
        print(f"    {r['id']} - {r['name']}{tag}")
print(f"\nTotal rules: {total}")
