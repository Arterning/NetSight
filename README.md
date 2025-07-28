# **App Name**: NetSight

## Core Features:

- IP Range Input: Accept user-defined IP ranges as input for network scanning.
- Network Scanning: Utilize Nmap and Masscan for parallel scanning to identify active IPs.
- Adaptive Scanning Rate: Dynamically adjust scanning rate based on network conditions to avoid disruption.
- Intelligent Asset Analysis: Employ an AI tool to analyze website content across multiple levels, summarizing the purpose, function, and services of identified assets.
- Business Value Identification: Determine business value delivered, if any, using an AI tool that summarizes and extracts value propositions from each website found.
- IP Association Analysis: Analyze the relationships between IP addresses, domains, geographical locations, and network topologies by acting as a reasoning tool and using IP geolocation databases (e.g., GeoIP) and domain resolution records to relate an IP back to its services
- Theme Toggle: Provide dark/light theme toggle.

## Style Guidelines:

- default theme is tailwind default dark theme, and support light/dark switch
- Body and headline font: 'Inter' (sans-serif) for clear, readable display of technical data. This font is suitable for both headlines and body text.
- Code font: 'Source Code Pro' (monospace) for displaying command-line outputs or configurations.
- Use minimalist icons to represent different asset types, network statuses, and analysis tools, focusing on clarity and usability.
- Design a responsive layout that adapts to different screen sizes, ensuring the platform is accessible across devices. Use a card-based layout for presenting individual asset summaries.


## Run test

```
pnpm test
pnpm test -- test/crawl-metadata.test.ts
```