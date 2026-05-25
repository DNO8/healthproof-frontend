import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoModule } from './crypto/crypto.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { StorageModule } from './storage/storage.module';
import { DocumentModule } from './document/document.module';
import { IssuerModule } from './issuer/issuer.module';
import { EmergencyModule } from './emergency/emergency.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CryptoModule,
    BlockchainModule,
    StorageModule,
    DocumentModule,
    IssuerModule,
    EmergencyModule,
  ],
})
export class AppModule {}
