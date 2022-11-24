import { StoreService as MedusaStoreService } from "@medusajs/medusa/dist/services";
import { EntityManager } from "typeorm";
import { CurrencyRepository } from "@medusajs/medusa/dist/repositories/currency";
import { Store } from "../entities/store.entity";
import {
  EntityEventType,
  Service,
  MedusaEventHandlerParams,
  OnMedusaEntityEvent,
} from "medusa-extender";
import { User } from "../../user/entities/user.entity";
import EventBusService from "@medusajs/medusa/dist/services/event-bus";
import StoreRepository from "../repositories/store.repository";
import { FindConfig } from "@medusajs/medusa/dist/types/common";

interface ConstructorParams {
  loggedInUser: User;
  manager: EntityManager;
  storeRepository: typeof StoreRepository;
  currencyRepository: typeof CurrencyRepository;
  eventBusService: EventBusService;
}

@Service({ override: MedusaStoreService, scope: "SCOPED" })
export default class StoreService extends MedusaStoreService {
  private readonly manager: EntityManager;
  private readonly storeRepository: typeof StoreRepository;

  constructor(private readonly container: ConstructorParams) {
    super(container);
    this.manager = container.manager;
    this.storeRepository = container.storeRepository;
  }

  withTransaction(transactionManager: EntityManager): StoreService {
    if (!transactionManager) {
      return this;
    }

    const cloned = new StoreService({
      ...this.container,
      manager: transactionManager,
    });

    cloned.transactionManager_ = transactionManager;

    return cloned;
  }

  @OnMedusaEntityEvent.Before.Insert(User, { async: true })
  public async createStoreForNewUser(
    params: MedusaEventHandlerParams<User, "Insert">
  ): Promise<EntityEventType<User, "Insert">> {
    const { event } = params;
    const createdStore = await this.withTransaction(
      event.manager
    ).createForUser(event.entity);
    if (!!createdStore) {
      event.entity.store_id = createdStore.id;
    }
    return event;
  }

  public async createForUser(user: User): Promise<Store | void> {
    if (user.store_id) {
      return;
    }
    const storeRepo = this.manager.getCustomRepository(this.storeRepository);
    const store = storeRepo.create() as Store;
    return storeRepo.save(store);
  }

  public async retrieve(config: FindConfig<Store>) {
    if (!this.container.loggedInUser) {
      return super.retrieve(config);
    }

    const storeRepo = this.manager.getCustomRepository(this.storeRepository);
    const store = await storeRepo.findOne(this.container.loggedInUser.id, {
      config,
      join: { alias: "store", innerJoin: { members: "store.members" } },
      where: (qb) => {
        qb.where("members.id = :memberId", {
          memberId: this.container.loggedInUser.id,
        });
      },
    });

    if (!store) {
      throw new Error("Unable to find the user store");
    }

    return store;
  }
}
