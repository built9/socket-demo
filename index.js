const Koa = require("koa");
const router = require("koa-router")();
const static = require("koa-static");
const app = new Koa();
const axios = require("axios");
const querystring = require("querystring");
const jwt = require("jsonwebtoken");
const jwtAuth = require("koa-jwt");

const server = require("http").Server(app.callback());
const io = require("socket.io")(server);

const accessTokens = {};
const secret = "secret";
const config = {
  client_id: "33ed6e40cdb09c60448b",
  client_secret: "87018f37b6fe2fa88fc2afa80aa742615c977ed0"
};

app.use(static(__dirname + "/"));

router.get("/auth/github/login", async ctx => {
  var dataStr = new Date().valueOf();
  var path = `https://github.com/login/oauth/authorize?${querystring.stringify({
    client_id: config.client_id
  })}`;
  ctx.redirect(path);
});
router.get("/github/oauth/callback", async ctx => {
  const code = ctx.query.code;
  const params = {
    client_id: config.client_id,
    client_secret: config.client_secret,
    code: code
  };
  let res = await axios.post(
    "https://github.com/login/oauth/access_token",
    params
  );
  const access_token = querystring.parse(res.data).access_token;
  const uid = Math.random() * 99999;
  accessTokens[uid] = access_token;

  const token = jwt.sign(
    {
      data: uid,
      // 设置 token 过期时间，一小时后，秒为单位
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    },
    secret
  );
  ctx.response.type = "html";
  ctx.response.body = ` <script>window.localStorage.setItem("authSuccess","true");window.localStorage.setItem("token","${token}");window.close();</script>`;
});

router.get(
  "/auth/github/userinfo",
  jwtAuth({
    secret
  }),
  async ctx => {
    // 验证通过，state.user
    console.log("jwt playload:", ctx.state.user);
    const access_token = accessTokens[ctx.state.user.data];
    res = await axios.get(
      "https://api.github.com/user?access_token=" + access_token
    );
    console.log("userAccess:", res.data);
    ctx.body = res.data;
  }
);
router.get("/login", async ctx => {
  ctx.body = ctx.query;
});
app.use(router.routes()); /*启动路由*/
app.use(router.allowedMethods());

io.on("connection", socket => {
  socket.on("chat message", msg => {
    console.log("message: " + msg);
    io.emit("chat message", msg);
  });
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});
server.listen(3000, () => {
  console.log("app run at : http://127.0.0.1:3000");
});
