**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Oracle Cloud

The deployment workflow runs on pushes to `main` or can be started manually.
Before running it, add these repository secrets under **Settings → Secrets and
variables → Actions**:

- `OCI_HOST`: the VM's public IP address or hostname, without a URL scheme.
- `OCI_USER`: the SSH user; the deployment currently expects `opc`.
- `OCI_SSH_KEY`: the complete, unencrypted private SSH key whose public key is
  authorized for that user on the VM.

The VM must be reachable over SSH on port 22. The workflow fails before the
build if any of these secrets is missing; configure them in GitHub rather than
adding credentials to the repository.
