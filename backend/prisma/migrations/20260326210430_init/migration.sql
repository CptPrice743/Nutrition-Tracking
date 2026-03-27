-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weight_kg" DECIMAL(5,2),
    "calories_consumed" INTEGER,
    "protein_g" INTEGER,
    "carbs_g" INTEGER,
    "fat_total_g" INTEGER,
    "fat_saturated_g" INTEGER,
    "fat_unsaturated_g" INTEGER,
    "fat_trans_g" DECIMAL(4,2),
    "magnesium_mg" INTEGER,
    "iron_mg" DECIMAL(5,2),
    "zinc_mg" DECIMAL(5,2),
    "water_litres" DECIMAL(4,2),
    "day_type" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "habit_type" TEXT NOT NULL,
    "unit_label" TEXT,
    "frequency_type" TEXT NOT NULL,
    "frequency_x" INTEGER,
    "frequency_y" INTEGER,
    "target_value" DECIMAL(65,30),
    "target_direction" TEXT,
    "is_calorie_burning" BOOLEAN NOT NULL DEFAULT false,
    "calorie_unit" DECIMAL(65,30),
    "calorie_kcal" DECIMAL(65,30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "habit_id" TEXT NOT NULL,
    "daily_log_id" TEXT,
    "log_date" DATE NOT NULL,
    "value" DECIMAL(65,30),
    "calories_burned" DECIMAL(65,30),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "layout_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_user_id_date_key" ON "daily_logs"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "habit_logs_user_id_habit_id_log_date_key" ON "habit_logs"("user_id", "habit_id", "log_date");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layouts_user_id_key" ON "dashboard_layouts"("user_id");

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
