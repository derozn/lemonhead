import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { HttpGovukContentClient } from './client.ts';
import { buildServer } from './server.ts';

serveStdio(() => buildServer(new HttpGovukContentClient()));
