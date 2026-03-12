"""Tests for the compliance engine."""
import pytest
from app.services.compliance import ComplianceEngine
from app.models.schemas import CategoryScore


@pytest.fixture
def engine():
    return ComplianceEngine()


class TestComplianceEngine:
    def test_load_rules(self, engine):
        """Engine should load rules from YAML file."""
        assert len(engine._rules) > 0
        # Flatten rules from categories to check for sdk-001
        all_rules = [
            rule
            for cat in engine._rules
            for rule in cat.get("rules", [])
        ]
        assert any(r["id"] == "SDK-001" for r in all_rules)

    def test_passing_csproj(self, engine):
        """A .NET 10 project should pass SDK checks."""
        csproj = """<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>14</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <PublishAot>true</PublishAot>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.Hosting" Version="10.0.0" />
  </ItemGroup>
</Project>"""
        cs_content = """
using System;
namespace Test;
public class Foo
{
    public required string Name { get; init; }
    public void DoWork() => Console.WriteLine("Hello");
}
"""
        results, category_scores = engine.evaluate(
            csproj_contents=[csproj],
            cs_contents=[cs_content],
            file_list=["Program.cs", "Foo.cs", "global.json", ".editorconfig"],
            extra_files={"global.json": '{"sdk":{"version":"10.0.100"}}'},
        )
        assert len(results) > 0
        passing = [r for r in results if r.status.value == "pass"]
        assert len(passing) >= 3  # at least SDK target, langversion, nullable

    def test_failing_csproj(self, engine):
        """An old .NET 6 project should fail SDK checks."""
        csproj = """<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
  </PropertyGroup>
</Project>"""
        results, _ = engine.evaluate(
            csproj_contents=[csproj],
            cs_contents=[],
            file_list=["Program.cs"],
        )
        failing = [r for r in results if r.status.value == "fail"]
        assert len(failing) > 0
        # sdk-001 should fail
        sdk_fail = [r for r in failing if r.rule_id == "SDK-001"]
        assert len(sdk_fail) == 1

    def test_category_scores(self, engine):
        """Category scores should be computed correctly."""
        csproj = """<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <LangVersion>14</LangVersion>
  </PropertyGroup>
</Project>"""
        results, category_scores = engine.evaluate(
            csproj_contents=[csproj],
            cs_contents=[],
            file_list=["Program.cs"],
        )
        assert len(category_scores) > 0
        for cat in category_scores:
            assert 0 <= cat.score <= 100
            assert cat.passed <= cat.total_rules

    def test_overall_score(self):
        """Overall score should average category scores."""
        cats = [
            CategoryScore(category="A", score=80, total_rules=5, passed=4, failed=1, not_applicable=0),
            CategoryScore(category="B", score=60, total_rules=5, passed=3, failed=2, not_applicable=0),
        ]
        score = ComplianceEngine.compute_overall_score(cats)
        assert score == 70.0

    def test_empty_input(self, engine):
        """Empty inputs should still return results (all N/A or fail)."""
        results, category_scores = engine.evaluate(
            csproj_contents=[],
            cs_contents=[],
            file_list=[],
        )
        assert len(results) > 0
