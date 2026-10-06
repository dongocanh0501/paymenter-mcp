# Contributing to Paymenter MCP Server

Thank you for your interest in contributing to the **Paymenter MCP Server** project! We welcome contributions, bug reports, feature requests, and improvements from developers, AI engineers, and the Paymenter community.

---

## 🛠️ Development & Principles

Paymenter MCP Server follows strict engineering standards:
1. **Zero External Dependencies**: The core server (`server.js`) strictly uses native Node.js standard modules (`http`, `https`, `readline`, `url`). Do not introduce runtime npm packages without compelling architectural justification.
2. **Standard Compliance**:
   - Model Context Protocol (MCP) JSON-RPC 2.0 stdio protocol.
   - Paymenter v1.2.0+ JSON:API v1.0 specifications (`application/vnd.api+json`).
   - JSON Schema Draft-07 for all tool input definitions.
3. **Verification First**: All PRs must pass the offline test ratchet suite:
   ```bash
   node server.js --test
   ```
   All 9 self-tests must pass with Exit Code 0.

---

## 🚀 How to Contribute

### 1. Reporting Bugs
- Please check existing issues before submitting a new one.
- Use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md).
- Include reproduction steps, your Node.js version, Paymenter version, and client environment (Antigravity, Claude Desktop, Cursor).

### 2. Suggesting Features / New Tools
- Use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md).
- Clearly explain the business use case and which Paymenter API endpoints are involved.

### 3. Submitting Pull Requests
1. Fork the repository.
2. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/add-new-paymenter-tool
   ```
3. Make your changes adhering to code style and zero-dependency guidelines.
4. Run the self-test suite:
   ```bash
   node server.js --test
   ```
5. Commit with conventional commit messages:
   ```bash
   git commit -m "feat(tools): add paymenter_audit_logs tool"
   ```
6. Push to your branch and open a Pull Request.

---

## 📄 License
By contributing to this repository, you agree that your contributions will be licensed under the [MIT License](LICENSE).
