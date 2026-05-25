import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { EmergencyService } from './emergency.service';

function getBearerWallet(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.wallet?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Post('store-key')
  async storeKey(
    @Headers('authorization') authHeader: string,
    @Body() body: {
      requestId: string;
      patientWallet: string;
      guardianWallet: string;
      encryptedKey: string;
      expiresAt: number;
    },
  ) {
    const caller = getBearerWallet(authHeader);
    if (!caller) throw new UnauthorizedException('Missing auth');

    if (caller !== body.patientWallet.toLowerCase()) {
      throw new UnauthorizedException('Only patient can store key');
    }

    if (!body.requestId || !body.encryptedKey || !body.expiresAt) {
      throw new BadRequestException('Missing required fields');
    }

    return this.emergencyService.storeKey({
      ...body,
      expiresAt: new Date(body.expiresAt * 1000),
    });
  }

  @Get('retrieve-key/:requestId')
  async retrieveKey(
    @Headers('authorization') authHeader: string,
    @Param('requestId') requestId: string,
  ) {
    const caller = getBearerWallet(authHeader);
    if (!caller) throw new UnauthorizedException('Missing auth');

    const record = await this.emergencyService.retrieveKey(requestId, caller);
    if (!record) throw new BadRequestException('Key not found or expired');

    return { encryptedKey: record.encryptedKey, expiresAt: record.expiresAt };
  }

  @Delete('delete-key/:requestId')
  async deleteKey(
    @Headers('authorization') authHeader: string,
    @Param('requestId') requestId: string,
  ) {
    const caller = getBearerWallet(authHeader);
    if (!caller) throw new UnauthorizedException('Missing auth');

    await this.emergencyService.deleteKey(requestId);
    return { success: true };
  }

  @Get('list/:patientWallet')
  async listByPatient(
    @Headers('authorization') authHeader: string,
    @Param('patientWallet') patientWallet: string,
  ) {
    const caller = getBearerWallet(authHeader);
    if (!caller) throw new UnauthorizedException('Missing auth');

    if (caller !== patientWallet.toLowerCase()) {
      throw new UnauthorizedException('Can only list own keys');
    }

    return this.emergencyService.listByPatient(patientWallet);
  }
}
