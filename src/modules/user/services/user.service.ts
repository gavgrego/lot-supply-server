import { Service } from "medusa-extender";
import { EntityManager, FindConditions } from "typeorm";
import EventBusService from "@medusajs/medusa/dist/services/event-bus";
import { FindConfig } from "@medusajs/medusa/dist/types/common";
import {
  AnalyticsConfigService,
  UserService as MedusaUserService,
} from "@medusajs/medusa/dist/services";
import { User } from "../entities/user.entity";
import UserRepository from "../repositories/user.repository";
import { MedusaError } from "medusa-core-utils";
import { FlagRouter } from "@medusajs/medusa/dist/utils/flag-router";

// type mismatch due to medusja and https://dev.to/medusajs/create-an-open-source-commerce-marketplace-part-1-3m5k
// manually create type that's not exported by medusajs
type ConstructorParams = {
  userRepository: typeof UserRepository;
  analyticsConfigService: AnalyticsConfigService;
  eventBusService: EventBusService;
  manager: EntityManager;
  featureFlagRouter: FlagRouter;
};

@Service({ override: MedusaUserService })
export default class UserService extends MedusaUserService {
  private readonly manager: EntityManager;
  private readonly userRepository: typeof UserRepository;
  private readonly eventBus: EventBusService;

  constructor(private readonly container: ConstructorParams) {
    super(container);
    this.manager = container.manager;
    this.userRepository = container.userRepository;
    this.eventBus = container.eventBusService;
  }

  public async retrieve(
    userId: string,
    config?: FindConfig<User>
  ): Promise<User> {
    const userRepo = this.manager.getCustomRepository(this.userRepository);
    const validatedId = this.manager.getId(userId);
    const query = this.manager.query(validatedId, [config]);

    const user = await userRepo.findOne(query as FindConditions<User>);

    if (!user) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `User with id: ${userId} was not found`
      );
    }

    return user as User;
  }
}
