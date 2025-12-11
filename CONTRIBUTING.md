# Contributing to ExistingProduct1-3Dec

Thank you for your interest in contributing to ExistingProduct1-3Dec! We welcome contributions from the community and appreciate your effort to improve this project.

Before contributing, please take a moment to review this document to understand our development process and guidelines. For a general overview of the project, please refer to our [README.md](README.md).

## Table of Contents

- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Fork and Clone](#fork-and-clone)
  - [Environment Setup](#environment-setup)
  - [Running the Development Server](#running-the-development-server)
- [Code Style](#code-style)
  - [PEP 8 Compliance](#pep-8-compliance)
  - [Type Hints](#type-hints)
  - [Docstrings](#docstrings)
  - [Import Sorting](#import-sorting)
  - [Code Formatting](#code-formatting)
  - [Linting](#linting)
- [Testing](#testing)
  - [Running Tests](#running-tests)
  - [Test Coverage](#test-coverage)
  - [Writing Tests](#writing-tests)
- [Pull Request Process](#pull-request-process)
  - [Creating a Branch](#creating-a-branch)
  - [Making Changes](#making-changes)
  - [Submitting a Pull Request](#submitting-a-pull-request)
- [Commit Message Format](#commit-message-format)
  - [Commit Types](#commit-types)
  - [Commit Message Examples](#commit-message-examples)
- [Code Review Guidelines](#code-review-guidelines)
  - [For Authors](#for-authors)
  - [For Reviewers](#for-reviewers)

---

## Development Setup

### Prerequisites

Before you begin, ensure you have the following installed on your development machine:

- **Python 3.12+** - [Download Python](https://www.python.org/downloads/)
- **pip** - Python package installer (included with Python 3.12+)
- **virtualenv** (recommended) - For isolated Python environments
- **Git** - Version control system

Verify your installations:

```bash
# Check Python version
python --version  # Should output Python 3.12.x or higher

# Check pip version
pip --version

# Check Git version
git --version
```

### Fork and Clone

1. **Fork the repository** on GitHub by clicking the "Fork" button in the top-right corner of the repository page.

2. **Clone your forked repository** to your local machine:

```bash
git clone https://github.com/<your-username>/ExistingProduct1-3Dec.git
cd ExistingProduct1-3Dec
```

3. **Add the upstream repository** as a remote to keep your fork in sync:

```bash
git remote add upstream https://github.com/<original-owner>/ExistingProduct1-3Dec.git
```

4. **Verify your remotes**:

```bash
git remote -v
# origin    https://github.com/<your-username>/ExistingProduct1-3Dec.git (fetch)
# origin    https://github.com/<your-username>/ExistingProduct1-3Dec.git (push)
# upstream  https://github.com/<original-owner>/ExistingProduct1-3Dec.git (fetch)
# upstream  https://github.com/<original-owner>/ExistingProduct1-3Dec.git (push)
```

### Environment Setup

1. **Create and activate a virtual environment**:

```bash
# Create virtual environment
python -m venv venv

# Activate on Linux/macOS
source venv/bin/activate

# Activate on Windows (Command Prompt)
venv\Scripts\activate

# Activate on Windows (PowerShell)
venv\Scripts\Activate.ps1
```

2. **Install project dependencies**:

```bash
pip install -r requirements.txt
```

3. **Install development dependencies** (if separate dev requirements exist):

```bash
# Install development tools for linting and formatting
pip install flake8 black isort pytest-cov
```

4. **Configure environment variables**:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your local configuration
# See .env.example for available configuration options
```

### Running the Development Server

Start the Flask development server to verify your setup:

```bash
# Using Flask CLI
flask run

# Or using Python directly
python app.py

# With custom host and port
flask run --host=0.0.0.0 --port=5000
```

The development server will start at `http://localhost:5000` with:
- Auto-reload on code changes
- Debug mode with detailed error pages
- Interactive debugger

---

## Code Style

This project follows Python best practices to maintain code quality and consistency. All contributions must adhere to these guidelines.

### PEP 8 Compliance

All Python code must follow [PEP 8](https://peps.python.org/pep-0008/) - the official Python style guide.

**Key requirements:**

- **Line length**: Maximum 88 characters (Black default)
- **Indentation**: 4 spaces (no tabs)
- **Blank lines**: 2 blank lines between top-level definitions, 1 blank line between method definitions
- **Imports**: Grouped in order: standard library, third-party, local application
- **Naming conventions**:
  - `snake_case` for functions, methods, and variables
  - `PascalCase` for classes
  - `UPPER_CASE` for constants

### Type Hints

Type hints are **required** for all function signatures. They improve code readability and enable better IDE support.

**Example:**

```python
def process_user_data(user_id: int, include_details: bool = False) -> dict:
    """Process user data and return formatted result."""
    pass


def calculate_total(items: list[dict]) -> float:
    """Calculate total price from a list of items."""
    pass


def get_config_value(key: str, default: str | None = None) -> str | None:
    """Retrieve configuration value by key."""
    pass
```

### Docstrings

All public functions, methods, and classes must have **Google-style docstrings**.

**Function/Method Docstring Template:**

```python
def function_name(param1: str, param2: int, param3: bool = True) -> ReturnType:
    """Short one-line description of the function.

    Longer description if needed, explaining the function's purpose,
    behavior, and any important details that users should know.

    Args:
        param1: Description of the first parameter.
        param2: Description of the second parameter.
        param3: Description of the third parameter with its default value.

    Returns:
        Description of what the function returns. Include details about
        the structure if returning a complex object.

    Raises:
        ValueError: When an invalid value is provided.
        TypeError: When parameter types are incorrect.

    Example:
        >>> result = function_name("test", 42)
        >>> print(result)
        expected_output
    """
    pass
```

**Class Docstring Template:**

```python
class UserService:
    """Service class for managing user operations.

    This class provides methods for creating, updating, and retrieving
    user information from the database.

    Attributes:
        db: Database connection instance.
        cache: Optional cache service for performance optimization.

    Example:
        >>> service = UserService(db_connection)
        >>> user = service.get_user(user_id=123)
    """

    def __init__(self, db: Database, cache: Cache | None = None) -> None:
        """Initialize the UserService with required dependencies.

        Args:
            db: Database connection instance.
            cache: Optional cache service.
        """
        self.db = db
        self.cache = cache
```

### Import Sorting

Use **isort** to automatically sort imports in the correct order.

**Import order:**

1. Standard library imports
2. Third-party imports
3. Local application imports

**Example:**

```python
# Standard library
import os
from datetime import datetime
from typing import Optional

# Third-party
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

# Local application
from config import Config
from models import User
from utils.helpers import format_response
```

**Running isort:**

```bash
# Check import sorting
isort --check-only .

# Fix import sorting
isort .
```

### Code Formatting

Use **Black** as the code formatter with default settings (88 character line length).

```bash
# Check formatting without making changes
black --check .

# Format all Python files
black .

# Format a specific file
black app.py
```

**Note:** Black is opinionated and non-configurable by design. This ensures consistent formatting across all contributions.

### Linting

Use **flake8** for code quality checks.

```bash
# Run linting on all files
flake8 .

# Run linting on specific file
flake8 app.py

# Run with verbose output
flake8 --verbose .
```

**Configure flake8** by creating a `.flake8` file or adding configuration to `setup.cfg`:

```ini
[flake8]
max-line-length = 88
extend-ignore = E203, W503
exclude = venv, .git, __pycache__
```

---

## Testing

All new features and bug fixes must include appropriate tests. We use **pytest** as our testing framework along with **pytest-flask** for Flask-specific testing.

### Running Tests

```bash
# Run all tests
pytest

# Run tests with verbose output
pytest -v

# Run tests with print statements shown
pytest -v -s

# Run specific test file
pytest tests/test_api.py

# Run tests matching a pattern
pytest -k "test_user"

# Run tests and stop on first failure
pytest -x

# Run only previously failed tests
pytest --lf
```

### Test Coverage

Maintain high test coverage for all new code.

```bash
# Run tests with coverage report
pytest --cov=. --cov-report=html

# Generate terminal coverage report
pytest --cov=. --cov-report=term-missing

# Fail if coverage is below threshold
pytest --cov=. --cov-fail-under=80
```

View the HTML coverage report by opening `htmlcov/index.html` in your browser.

### Writing Tests

**Test File Structure:**

```python
"""Tests for user API endpoints."""

import pytest
from flask import Flask

from app import create_app


@pytest.fixture
def app() -> Flask:
    """Create application for testing."""
    app = create_app("testing")
    yield app


@pytest.fixture
def client(app: Flask):
    """Create test client."""
    return app.test_client()


class TestHealthEndpoint:
    """Test cases for health check endpoint."""

    def test_health_returns_200(self, client):
        """Test that health endpoint returns 200 OK."""
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_returns_json(self, client):
        """Test that health endpoint returns JSON response."""
        response = client.get("/api/health")
        assert response.content_type == "application/json"

    def test_health_response_structure(self, client):
        """Test that health response has correct structure."""
        response = client.get("/api/health")
        data = response.get_json()
        assert "status" in data
```

**Testing Best Practices:**

- Write descriptive test names that explain what is being tested
- Use fixtures to set up test data and dependencies
- Test both success and error cases
- Test edge cases and boundary conditions
- Keep tests independent and isolated
- Mock external dependencies when appropriate

---

## Pull Request Process

### Creating a Branch

1. **Sync your fork** with the upstream repository:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

2. **Create a feature branch** with a descriptive name:

```bash
# For new features
git checkout -b feature/add-user-authentication

# For bug fixes
git checkout -b fix/resolve-database-connection-issue

# For documentation
git checkout -b docs/update-api-documentation

# For refactoring
git checkout -b refactor/improve-error-handling
```

### Making Changes

1. **Make atomic commits** - each commit should represent a single logical change
2. **Write clear commit messages** following our [commit message format](#commit-message-format)
3. **Ensure all tests pass** before committing:

```bash
pytest
```

4. **Run linting and formatting**:

```bash
black .
isort .
flake8 .
```

5. **Update documentation** if your changes affect:
   - Public API endpoints
   - Configuration options
   - Installation/setup process
   - Usage examples

### Submitting a Pull Request

1. **Push your branch** to your fork:

```bash
git push origin feature/your-feature-name
```

2. **Create a Pull Request** on GitHub:
   - Navigate to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template

3. **PR Description should include:**
   - **Summary**: Brief description of the changes
   - **Motivation**: Why this change is needed
   - **Changes**: List of specific changes made
   - **Testing**: How the changes were tested
   - **Related Issues**: Link to related issues using `#issue-number` or `Fixes #issue-number`

**PR Template:**

```markdown
## Summary
Brief description of the changes.

## Motivation
Why is this change necessary? What problem does it solve?

## Changes
- Change 1
- Change 2
- Change 3

## Testing
Describe how you tested these changes.

## Related Issues
Fixes #123
Related to #456

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow convention
```

---

## Commit Message Format

We follow the **Conventional Commits** specification for commit messages. This enables automatic changelog generation and makes the commit history easier to understand.

### Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `style` | Code style changes (formatting, whitespace) |
| `refactor` | Code refactoring (no functional changes) |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies, or tooling changes |
| `perf` | Performance improvements |
| `ci` | Continuous integration changes |
| `revert` | Reverting a previous commit |

### Commit Message Structure

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Rules:**

- **Subject line**: Maximum 50 characters, lowercase, no period at end
- **Scope** (optional): The area of the codebase affected (e.g., `api`, `auth`, `config`)
- **Body** (optional): Detailed explanation if needed, wrapped at 72 characters
- **Footer** (optional): References to issues or breaking changes

### Commit Message Examples

**Simple commits:**

```bash
# Feature
git commit -m "feat: add user authentication endpoint"

# Bug fix
git commit -m "fix: resolve database connection timeout"

# Documentation
git commit -m "docs: update API documentation for health endpoint"

# Style
git commit -m "style: format code with black"

# Refactor
git commit -m "refactor: extract validation logic into separate module"

# Test
git commit -m "test: add unit tests for user service"

# Chore
git commit -m "chore: update dependencies to latest versions"
```

**With scope:**

```bash
git commit -m "feat(api): add pagination to user list endpoint"
git commit -m "fix(auth): handle expired token gracefully"
git commit -m "docs(readme): add troubleshooting section"
```

**With body and footer:**

```bash
git commit -m "feat(api): add user authentication endpoint

Implement JWT-based authentication with refresh tokens.
Include rate limiting and account lockout features.

Closes #123"
```

---

## Code Review Guidelines

Code reviews are an essential part of maintaining code quality. All pull requests require at least one approval before merging.

### For Authors

- **Respond promptly** to review comments
- **Be open to feedback** and willing to make changes
- **Explain your reasoning** when you disagree with a suggestion
- **Keep PRs focused** - smaller PRs are easier to review
- **Update the PR** based on feedback rather than opening a new one
- **Mark conversations as resolved** when addressed
- **Request re-review** after making significant changes

### For Reviewers

- **Be respectful and constructive** - focus on the code, not the author
- **Explain the "why"** behind your suggestions
- **Distinguish between required changes and suggestions**:
  - Use "must" or "required" for blocking issues
  - Use "consider" or "suggestion" for optional improvements
- **Provide actionable feedback** with specific recommendations
- **Acknowledge good work** - positive feedback is valuable too
- **Review promptly** - aim to review within 24-48 hours
- **Check for:**
  - Code correctness and logic
  - Test coverage and quality
  - Documentation updates
  - Security considerations
  - Performance implications
  - Code style consistency

**Review Comment Examples:**

```markdown
# Good review comment
Consider using a context manager here to ensure the file is properly closed:
```python
with open(filename) as f:
    data = f.read()
```

# Good review comment
This function is getting complex. Consider extracting the validation logic
into a separate `validate_user_input()` function for better readability.

# Good review comment  
Nice refactoring! This is much more readable than before. 👍
```

---

## Questions?

If you have any questions about contributing, please:

1. Check existing [issues](https://github.com/<owner>/ExistingProduct1-3Dec/issues) and [discussions](https://github.com/<owner>/ExistingProduct1-3Dec/discussions)
2. Review the [README.md](README.md) for project overview
3. Open a new issue with the `question` label

Thank you for contributing to ExistingProduct1-3Dec! 🎉
