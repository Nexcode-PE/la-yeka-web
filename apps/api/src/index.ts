import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') })
import { serve } from '@hono/node-server'
import app from './app.js'
serve({ fetch: app.fetch, port: Number(process.env.PORT || 3001) })
