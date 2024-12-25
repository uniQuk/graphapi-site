# Microsoft Graph API Site

> **Note**: This is an independent project and is not affiliated with, officially maintained, or endorsed by Microsoft. The API specifications are sourced from Microsoft's official [msgraph-sdk-powershell](https://github.com/microsoftgraph/msgraph-sdk-powershell/) repository.

This repository hosts the generated static site for the [Microsoft Graph API Viewer](https://github.com/uniQuk/GraphAPI-Viewer) project. The site provides an interactive interface for exploring Microsoft Graph API's OpenAPI specifications.

View the live site at: [https://uniquk.github.io/graphapi-site/](https://uniquk.github.io/graphapi-site/)

## About

This is a generated site repository. The source code and build tools can be found in the main [graphapi-viewer](https://github.com/uniQuk/GraphAPI-Viewer) repository.

## Features

- 🌓 Dark/Light mode with system preference support
- 📱 Responsive design using Bootstrap 5
- 🔄 Switch between v1.0 and beta API versions
- 🎨 Color-coded HTTP methods
- ⚡ Lazy loading of endpoint details
- 📊 Structured parameter and response displays
- 🔍 Clear endpoint organization
- 💾 Persistent theme preferences
- 📱 Mobile-friendly interface

## Contributing

Please make contributions to the main [graphapi-viewer](https://github.com/microsoftgraph/graphapi-viewer) repository. This repository only contains the generated static site files.

## Data Source

The OpenAPI specifications are fetched from:
- Repository: [microsoftgraph/msgraph-sdk-powershell](https://github.com/microsoftgraph/msgraph-sdk-powershell)
- Path: `/openApiDocs`
- Versions: `v1.0` and `beta`

## Deployment

The `build` directory can be deployed to:
- GitHub Pages
- Netlify
- Any static hosting service
- Local web servers

## Tech Stack

- **Bootstrap 5.3.2**: UI framework
- **Bootstrap Icons 1.11.1**: Icon set
- **PyYAML**: YAML processing
- **Requests**: HTTP client

## License

MIT License - see [LICENSE](LICENSE)

For third-party licenses, see [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)