import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface StoreKeyInput {
  requestId: string;
  patientWallet: string;
  guardianWallet: string;
  encryptedKey: string;
  expiresAt: Date;
}

@Injectable()
export class EmergencyService {
  constructor(private prisma: PrismaService) {}

  async storeKey(data: StoreKeyInput) {
    return this.prisma.emergencyKeyEscrow.create({
      data: {
        requestId: data.requestId,
        patientWallet: data.patientWallet.toLowerCase(),
        guardianWallet: data.guardianWallet.toLowerCase(),
        encryptedKey: data.encryptedKey,
        expiresAt: data.expiresAt,
      },
    });
  }

  async retrieveKey(requestId: string, guardianWallet: string) {
    const record = await this.prisma.emergencyKeyEscrow.findFirst({
      where: {
        requestId,
        guardianWallet: guardianWallet.toLowerCase(),
        expiresAt: { gt: new Date() },
      },
    });
    return record;
  }

  async deleteKey(requestId: string) {
    return this.prisma.emergencyKeyEscrow.deleteMany({
      where: { requestId },
    });
  }

  async listByPatient(patientWallet: string) {
    return this.prisma.emergencyKeyEscrow.findMany({
      where: {
        patientWallet: patientWallet.toLowerCase(),
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
