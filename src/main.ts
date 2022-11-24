import express = require("express");
const config = require("../medusa-config");
import { Medusa } from "medusa-extender";
import { resolve } from "path";
import { StoreModule } from "./modules/store/store.module";
import { UserModule } from "./modules/user/user.module";

async function bootstrap() {
  const expressInstance = express();

  await new Medusa(resolve(__dirname, ".."), expressInstance).load([
    StoreModule,
    UserModule,
  ]);

  const port = config?.serverConfig?.port ?? 9000;
  expressInstance.listen(port, () => {
    console.info("Server successfully started on port " + port);
  });
}

bootstrap();
