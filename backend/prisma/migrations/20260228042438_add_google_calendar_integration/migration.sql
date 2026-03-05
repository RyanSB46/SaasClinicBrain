-- CreateEnum
CREATE TYPE "AppointmentMode" AS ENUM ('PRESENCIAL', 'REMOTO');

-- CreateEnum
CREATE TYPE "GoogleSyncAction" AS ENUM ('UPSERT', 'DELETE');

-- CreateEnum
CREATE TYPE "GoogleSyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "mode" "AppointmentMode" NOT NULL DEFAULT 'PRESENCIAL';

-- AlterTable
ALTER TABLE "configuracoes" ADD COLUMN     "feature_google_calendar_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feature_google_convite_paciente_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feature_google_meet_ativo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "profissionais" ADD COLUMN     "google_access_token_enc" TEXT,
ADD COLUMN     "google_calendar_id" TEXT,
ADD COLUMN     "google_connected_at" TIMESTAMPTZ(3),
ADD COLUMN     "google_refresh_token_enc" TEXT,
ADD COLUMN     "google_token_expires_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "google_event_mapping" (
    "id" TEXT NOT NULL,
    "profissional_id" TEXT NOT NULL,
    "agendamento_id" TEXT NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "meeting_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_event_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_sync_jobs" (
    "id" TEXT NOT NULL,
    "profissional_id" TEXT NOT NULL,
    "agendamento_id" TEXT NOT NULL,
    "action" "GoogleSyncAction" NOT NULL,
    "status" "GoogleSyncStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "google_event_mapping_profissional_id_updated_at_idx" ON "google_event_mapping"("profissional_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "google_event_mapping_agendamento_id_key" ON "google_event_mapping"("agendamento_id");

-- CreateIndex
CREATE INDEX "google_sync_jobs_status_next_attempt_at_idx" ON "google_sync_jobs"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "google_sync_jobs_profissional_id_created_at_idx" ON "google_sync_jobs"("profissional_id", "created_at");

-- CreateIndex
CREATE INDEX "google_sync_jobs_agendamento_id_created_at_idx" ON "google_sync_jobs"("agendamento_id", "created_at");

-- AddForeignKey
ALTER TABLE "google_event_mapping" ADD CONSTRAINT "google_event_mapping_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "profissionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_event_mapping" ADD CONSTRAINT "google_event_mapping_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_sync_jobs" ADD CONSTRAINT "google_sync_jobs_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "profissionais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_sync_jobs" ADD CONSTRAINT "google_sync_jobs_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
