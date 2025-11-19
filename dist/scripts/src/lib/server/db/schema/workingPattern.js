"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workingPatterns = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.workingPatterns = (0, pg_core_1.pgTable)('working_patterns', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    jobTitle: (0, pg_core_1.varchar)('job_title', { length: 100 }), // should be FK to employee table
    workDays: (0, pg_core_1.json)('work_days'),
    weekPattern: (0, pg_core_1.varchar)('week_pattern', { length: 20 }),
    startTime: (0, pg_core_1.time)('start_time'),
    endTime: (0, pg_core_1.time)('end_time'),
    effectiveFrom: (0, pg_core_1.date)('effective_from').defaultNow(),
    effectiveTo: (0, pg_core_1.date)('effective_to')
});
