"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
var postgres_js_1 = require("drizzle-orm/postgres-js");
var postgres_1 = require("postgres");
var schema = require("./schema/index");
var dotenv_1 = require("dotenv");
dotenv_1.default.config(); // Load from .env
if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is not set');
var client = (0, postgres_1.default)(process.env.DATABASE_URL);
exports.db = (0, postgres_js_1.drizzle)(client, { schema: schema });
