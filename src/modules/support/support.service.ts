import { Injectable, Logger, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SupportTicket } from './entities/support.model';
import { StatusCode } from '../../common/enums/status-code.enum';
import { User } from '../auth/entities/user.model';
import { Organization } from '../organization/entities/organization.model';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(SupportTicket)
    private readonly supportTicketModel: typeof SupportTicket,
  ) {}

  async createTicket(userId: string, orgId: string | null, dto: any) {
    const { problem_name, description, image_url, video_url } = dto;

    if (!problem_name || !description) {
      throw new HttpException(
        'Problem name and description are required.',
        StatusCode.BAD_REQUEST,
      );
    }

    try {
      const ticket = await this.supportTicketModel.create({
        problem_name,
        description,
        image_url: image_url || null,
        video_url: video_url || null,
        user_id: userId,
        organization_id: orgId || null,
        status: 'OPEN',
      });

      return {
        message: 'Problem submitted successfully.',
        data: ticket,
      };
    } catch (error) {
      this.logger.error('[createTicket] Error submitting support ticket:', error);
      throw new HttpException(
        'Failed to submit support ticket. Please try again.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTicketsByUser(userId: string) {
    try {
      const tickets = await this.supportTicketModel.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
      });
      return { data: tickets };
    } catch (error) {
      this.logger.error('[getTicketsByUser] Error retrieving tickets:', error);
      throw new HttpException(
        'Failed to retrieve support tickets.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTicketById(id: string) {
    try {
      const ticket = await this.supportTicketModel.findByPk(id, {
        include: [
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role'],
          },
          {
            model: Organization,
            attributes: ['id', 'name'],
          },
        ],
      });
      if (!ticket) {
        throw new HttpException('Support ticket not found.', StatusCode.NOT_FOUND);
      }
      return { success: true, data: ticket };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('[getTicketById] Error retrieving ticket:', error);
      throw new HttpException(
        'Failed to retrieve support ticket.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllTickets() {
    try {
      const tickets = await this.supportTicketModel.findAll({
        include: [
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role'],
          },
          {
            model: Organization,
            attributes: ['id', 'name'],
          },
        ],
        order: [['created_at', 'DESC']],
      });
      return { data: tickets };
    } catch (error) {
      this.logger.error('[getAllTickets] Error retrieving all tickets:', error);
      throw new HttpException(
        'Failed to retrieve support tickets.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateTicketStatus(id: string, status: string) {
    try {
      const ticket = await this.supportTicketModel.findByPk(id);
      if (!ticket) {
        throw new HttpException('Support ticket not found.', StatusCode.NOT_FOUND);
      }

      // Revert/Backward status transition checks
      if (ticket.status === 'RESOLVED') {
        throw new HttpException('Resolved tickets cannot be changed.', StatusCode.BAD_REQUEST);
      }
      if (ticket.status === 'IN_PROGRESS' && status === 'OPEN') {
        throw new HttpException('Cannot revert status from In Progress to Open.', StatusCode.BAD_REQUEST);
      }
      if (ticket.status === status) {
        throw new HttpException('Ticket is already in this status.', StatusCode.BAD_REQUEST);
      }

      await ticket.update({ status });
      return { message: 'Ticket status updated successfully.', data: ticket };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('[updateTicketStatus] Error updating status:', error);
      throw new HttpException(
        'Failed to update ticket status.',
        StatusCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
