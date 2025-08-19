#!/usr/bin/env python3
"""
Script to run code quality checks on the API
"""

import subprocess
import sys
from pathlib import Path


def run_command(command: list[str], description: str) -> bool:
    """Run a command and return success status"""
    print(f"\n{'=' * 50}")
    print(f"Running {description}...")
    print(f"{'=' * 50}")

    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        print(result.stdout)
        print(f"✅ {description} passed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed!")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False


def main() -> None:
    """Run all code quality checks"""
    api_dir = Path(__file__).parent.parent

    # Change to API directory
    original_dir = Path.cwd()
    os.chdir(api_dir)

    try:
        # Run Ruff linting
        ruff_success = run_command(["ruff", "check", "."], "Ruff linting")

        # Run Ruff formatting check
        ruff_format_success = run_command(
            ["ruff", "format", "--check", "."], "Ruff formatting check"
        )

        # Run MyPy type checking
        mypy_success = run_command(["mypy", "."], "MyPy type checking")

        # Summary
        print(f"\n{'=' * 50}")
        print("SUMMARY")
        print(f"{'=' * 50}")
        print(f"Ruff linting: {'✅ PASSED' if ruff_success else '❌ FAILED'}")
        print(f"Ruff formatting: {'✅ PASSED' if ruff_format_success else '❌ FAILED'}")
        print(f"MyPy type checking: {'✅ PASSED' if mypy_success else '❌ FAILED'}")

        if all([ruff_success, ruff_format_success, mypy_success]):
            print("\n🎉 All checks passed!")
            sys.exit(0)
        else:
            print("\n💥 Some checks failed!")
            sys.exit(1)

    finally:
        # Restore original directory
        os.chdir(original_dir)


if __name__ == "__main__":
    import os

    main()
