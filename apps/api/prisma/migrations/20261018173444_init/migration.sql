-- CreateTable
CREATE TABLE `Mask` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `nameEs` VARCHAR(120) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL,
    `animal` VARCHAR(80) NOT NULL,
    `descriptionEs` TEXT NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `storyEs` TEXT NULL,
    `storyEn` TEXT NULL,
    `status` ENUM('AVAILABLE', 'RESERVED', 'SOLD', 'COMMISSION_EXAMPLE', 'DRAFT') NOT NULL DEFAULT 'DRAFT',
    `shopifyProductId` VARCHAR(64) NULL,
    `shopifyVariantId` VARCHAR(64) NULL,
    `priceUsd` DECIMAL(10, 2) NULL,
    `priceGtq` DECIMAL(12, 2) NULL,
    `weightGrams` INTEGER NULL,
    `lengthCm` DECIMAL(6, 1) NULL,
    `widthCm` DECIMAL(6, 1) NULL,
    `heightCm` DECIMAL(6, 1) NULL,
    `materialsCostGtq` DECIMAL(10, 2) NULL,
    `laborHours` DECIMAL(6, 2) NULL,
    `packagingProfileId` VARCHAR(191) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Mask_slug_key`(`slug`),
    UNIQUE INDEX `Mask_shopifyProductId_key`(`shopifyProductId`),
    UNIQUE INDEX `Mask_shopifyVariantId_key`(`shopifyVariantId`),
    INDEX `Mask_status_featured_idx`(`status`, `featured`),
    INDEX `Mask_animal_idx`(`animal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaskImage` (
    `id` VARCHAR(191) NOT NULL,
    `maskId` VARCHAR(191) NOT NULL,
    `r2Key` VARCHAR(512) NOT NULL,
    `shopifyMediaId` VARCHAR(64) NULL,
    `altEs` VARCHAR(300) NOT NULL,
    `altEn` VARCHAR(300) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `MaskImage_maskId_sortOrder_idx`(`maskId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Story` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `titleEs` VARCHAR(200) NOT NULL,
    `titleEn` VARCHAR(200) NOT NULL,
    `bodyEs` MEDIUMTEXT NOT NULL,
    `bodyEn` MEDIUMTEXT NOT NULL,
    `coverR2Key` VARCHAR(512) NULL,
    `maskId` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Story_slug_key`(`slug`),
    INDEX `Story_publishedAt_idx`(`publishedAt`),
    INDEX `Story_maskId_idx`(`maskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Video` (
    `id` VARCHAR(191) NOT NULL,
    `platform` ENUM('YOUTUBE', 'TIKTOK', 'INSTAGRAM') NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `externalId` VARCHAR(128) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `thumbnailUrl` VARCHAR(512) NULL,
    `maskId` VARCHAR(191) NULL,
    `storyId` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `source` ENUM('MANUAL', 'SYNC') NOT NULL DEFAULT 'MANUAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Video_maskId_idx`(`maskId`),
    INDEX `Video_storyId_idx`(`storyId`),
    UNIQUE INDEX `Video_platform_externalId_key`(`platform`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomRequest` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `whatsapp` VARCHAR(32) NULL,
    `country` CHAR(2) NOT NULL,
    `idea` TEXT NOT NULL,
    `colors` VARCHAR(300) NULL,
    `size` VARCHAR(100) NULL,
    `use` VARCHAR(300) NULL,
    `referenceR2Key` VARCHAR(512) NULL,
    `desiredDate` DATE NULL,
    `status` ENUM('NEW', 'QUOTED', 'DEPOSIT_PAID', 'IN_PROGRESS', 'BALANCE_PAID', 'SHIPPED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'NEW',
    `quoteUsd` DECIMAL(10, 2) NULL,
    `depositUsd` DECIMAL(10, 2) NULL,
    `shopifyDepositOrderId` VARCHAR(64) NULL,
    `shopifyDraftOrderId` VARCHAR(64) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomRequest_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShippingZone` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(16) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `countries` JSON NOT NULL,

    UNIQUE INDEX `ShippingZone_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShippingRate` (
    `id` VARCHAR(191) NOT NULL,
    `carrier` ENUM('FEDEX', 'POSTAL', 'COURIER_LOCAL', 'OTHER') NOT NULL,
    `service` VARCHAR(80) NOT NULL,
    `zoneId` VARCHAR(191) NOT NULL,
    `maxWeightKg` DECIMAL(6, 2) NOT NULL,
    `costUsd` DECIMAL(10, 2) NOT NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NULL,
    `source` VARCHAR(500) NOT NULL,
    `isEstimate` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ShippingRate_zoneId_carrier_maxWeightKg_idx`(`zoneId`, `carrier`, `maxWeightKg`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PackagingProfile` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `innerLengthCm` DECIMAL(6, 1) NOT NULL,
    `innerWidthCm` DECIMAL(6, 1) NOT NULL,
    `innerHeightCm` DECIMAL(6, 1) NOT NULL,
    `outerLengthCm` DECIMAL(6, 1) NOT NULL,
    `outerWidthCm` DECIMAL(6, 1) NOT NULL,
    `outerHeightCm` DECIMAL(6, 1) NOT NULL,
    `packagingWeightGrams` INTEGER NOT NULL,
    `costGtq` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `PackagingProfile_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CostSettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fxUsdGtq` DECIMAL(10, 4) NOT NULL,
    `gatewayPct` DECIMAL(5, 2) NOT NULL,
    `gatewayFixedUsd` DECIMAL(8, 2) NOT NULL,
    `shopifyThirdPartyPct` DECIMAL(5, 2) NOT NULL,
    `monthlyFixedUsd` DECIMAL(10, 2) NOT NULL,
    `expectedUnitsPerMonth` INTEGER NOT NULL,
    `laborRateGtqPerHour` DECIMAL(10, 2) NOT NULL,
    `targetMarginPct` DECIMAL(5, 2) NOT NULL,
    `volumetricDivisor` INTEGER NOT NULL,
    `usImportDutyPct` DECIMAL(5, 2) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedById` VARCHAR(191) NULL,

    INDEX `CostSettings_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `shopifyOrderId` VARCHAR(64) NOT NULL,
    `maskId` VARCHAR(191) NULL,
    `totalUsd` DECIMAL(10, 2) NOT NULL,
    `shippingCountry` CHAR(2) NULL,
    `carrier` ENUM('FEDEX', 'POSTAL', 'COURIER_LOCAL', 'OTHER') NULL,
    `trackingNumber` VARCHAR(64) NULL,
    `status` VARCHAR(40) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_shopifyOrderId_key`(`shopifyOrderId`),
    INDEX `Order_maskId_idx`(`maskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SocialAccount` (
    `id` VARCHAR(191) NOT NULL,
    `platform` ENUM('YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK') NOT NULL,
    `handle` VARCHAR(80) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `managedBy` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `SocialAccount_platform_handle_key`(`platform`, `handle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminUser` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('OWNER', 'EDITOR') NOT NULL DEFAULT 'EDITOR',
    `failedLogins` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminUser_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(64) NULL,
    `diff` JSON NULL,
    `ip` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `AuditLog_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Mask` ADD CONSTRAINT `Mask_packagingProfileId_fkey` FOREIGN KEY (`packagingProfileId`) REFERENCES `PackagingProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaskImage` ADD CONSTRAINT `MaskImage_maskId_fkey` FOREIGN KEY (`maskId`) REFERENCES `Mask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Story` ADD CONSTRAINT `Story_maskId_fkey` FOREIGN KEY (`maskId`) REFERENCES `Mask`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Video` ADD CONSTRAINT `Video_maskId_fkey` FOREIGN KEY (`maskId`) REFERENCES `Mask`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Video` ADD CONSTRAINT `Video_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `Story`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShippingRate` ADD CONSTRAINT `ShippingRate_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `ShippingZone`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostSettings` ADD CONSTRAINT `CostSettings_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_maskId_fkey` FOREIGN KEY (`maskId`) REFERENCES `Mask`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `AdminUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
