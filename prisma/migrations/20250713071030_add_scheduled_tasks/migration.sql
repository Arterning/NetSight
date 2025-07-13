-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT NOT NULL,
    "domain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "openPorts" TEXT,
    "valuePropositionScore" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "geolocation" TEXT,
    "services" TEXT,
    "networkTopology" TEXT,
    "taskName" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "owner" TEXT,
    "department" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "taskExecutionId" TEXT,
    CONSTRAINT "Asset_taskExecutionId_fkey" FOREIGN KEY ("taskExecutionId") REFERENCES "TaskExecution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ipRange" TEXT NOT NULL,
    "scanRate" TEXT NOT NULL,
    "scheduleType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" DATETIME,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaskExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduledTaskId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "duration" INTEGER,
    "errorMessage" TEXT,
    "assetsFound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskExecution_scheduledTaskId_fkey" FOREIGN KEY ("scheduledTaskId") REFERENCES "ScheduledTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_ip_key" ON "Asset"("ip");
