// ar.js
module.exports = {
  Nero: {
    newVersionDetected: "You are using version %1, the latest version is %2. Please update to use the bot better by typing into the console/cmd command: %3",
    autoRestart1: "Bot will auto restart in %1",
    autoRestart2: "Bot will auto restart by cron job: %1",
    googleApiTokenExpired: "Google API refresh token has expired or been revoked, please get a new token at https://developers.google.com/oauthplayground/"
  },
  login: {
    currentlyLogged: "Login in progress",
    notFoundDirAccount: "Cannot find file %1",
    loginToken: "Login with access token",
    loginCookieString: "Login with cookie string",
    loginCookieNetscape: "Login with cookie netscape",
    loginCookieArray: "Login with cookie array",
    loginPassword: "Login with email & password...",
    accountError: "Please enter the full permission token in the form of %1 or cookie in the form of string %2 or cookie in the form of array:\n[\n  { name: %3, value: %4 },\n  { name: %5, value: %6 }\n]\n or\n[\n  { key: %3, value: %4 },\n  { key: %5, value: %6 }\n]\ninto the file %7",
    cannotFindAccount: "Cannot find facebook account, choose one of the following options (enter the number to choose or press down and up to choose and enter to confirm):",
    chooseAccount: "Login with email and password",
    chooseToken: "Login with token full permission",
    chooseCookieString: "Login with cookie string",
    chooseCookieArray: "Login with cookie array",
    loginWith: "You choose to %1",
    inputEmail: "=> Please enter your email (id) or phone number facebook account:",
    inputPassword: "=> Please enter your password:",
    input2FA: "=> Please enter the 2FA code (leave blank if you don't have 2FA enabled):",
    inputToken: "=> Please enter your token full permission (start wit EAAAA):",
    inputCookieString: "=> Please enter your cookie string:",
    inputCookieArray: "=> Please enter your cookie array:",
    refreshCookie: "Refreshing cookie...",
    refreshCookieError: "An error occurred when refreshing the cookie",
    refreshCookieSuccess: "Refreshed cookie successfully, restart the bot to use the new cookie",
    refreshCookieWarning: "You have enabled the auto refresh cookie mode, but you have not configured email and password in the file config.json",
    tokenError: "Token is invalid or expired. Please enter the full permission token in the form of %1 into the file %2",
    cookieError: "Cookie is invalid or expired.",
    loginPasswordError: "Error occurred when logging in with email & password in config.json",
    loginSuccess: "Successful login",
    loginError: "An error occurred while signing in",
    openDashboardSuccess: "Successfully opened bot management page",
    openDashboardError: "An error occurred when opening the bot management page",
    changeGbanData: "DATA HAS BEEN CHANGED, IT IS CURRENTLY IMPOSSIBLE TO LAUNCH A BOT",
    errorNoti: "An error occurred when retrieving the message",
    refreshFbstateSuccess: "Refreshed %1 file",
    refreshFbstateError: "An error occurred when refreshing the %1 file",
    youAreBanned: "You have been banned from the Nero-Bot project",
    runBot: "Launch bot successfully, start receiving messages from users",
    notLoggedIn: "An error occurred, please check your Facebook account again",
    callBackError: "An error occurred when callback listenMqtt",
    userBanned: "You've been banned from using a bot!!",
    checkGbanError: "An error occurred while checking GBAN, try update source to latest version (open cmd and type: node update)",
    gbanMessage: "You have been banned from the Nero-Bot project on %1 for the reason: %2\n» Time: %3",
    gbanMessageToDate: "You have been banned from the Nero-Bot project on %1 for the reason: %2\n» Time: %3\n» To date: %4",
    gbanAdminMessage: "User %1 has been banned from the Nero-Bot project on %2 for the reason: %3",
    openServerUptimeSuccess: "🚀 Opened uptime server: %1",
    openServerUptimeError: "An error has occurred, cannot open server uptime",
    restartListenMessage: "ListenMQTT restart enabled every %1",
    stopRestartListenMessage: "ListenMQTT restart disabled",
    restartListenMessageError: "An error occurred when restarting ListenMQTT",
    restartListenMessage2: "Successfully restarted ListenMQTT",
    refreshCookieAfter: "Refreshing cookie after %1",
    listenMqttClose: "ListenMQTT closed",
    listenMqttCloseByUser: "ListenMQTT closed by user",
    retryCheckLiveCookie: "Retrying to check cookie... %1",
    startBotSuccess: "Bot has been started successfully, start receiving messages from users"
  },
  version: {
    tooOldVersion: "You are using a too old version of Nero-Bot, please update to the latest version by typing the command: %1 into the cmd/console/terminal/shell"
  },
  custom: {
    refreshedFb_dtsg: "Refreshed fb_dtsg and jazoest successfully",
    refreshedFb_dtsgError: "An error occurred when refreshing fb_dtsg and jazoest"
  },
  loadData: {
    loadThreadDataSuccess: "Loaded %1 group's data successfully!",
    loadUserDataSuccess: "Loaded %1 user's data successfully!",
    refreshingThreadData: "Updating the information of the groups...",
    refreshThreadDataSuccess: "Updated information of %1 group!",
    refreshThreadDataError: "Something went wrong when updating the groups information!"
  },
  loadScripts: {
    loadScriptsError: "The %1 files have an error during loading:",
    loadScriptsNotMatchOrigin: "The %1 files do not match the original files on the github project, make sure that these command files are reliable:",
    NOT_FOUND: "NOT FOUND IN THE ORIGINAL SOURCE CODE:",
    NOT_MATCH: "DOES NOT MATCH THE ORIGINAL SOURCE CODE:"
  },
  socketIO: {
    connected: "Connected to socket.io server",
    error: "An error occurred when connecting to the socket.io server"
  },
  handlerCheckData: {
    cantCreateThread: "Groups with id '%1' cannot be written to the database!",
    cantCreateUser: "Users with id '%1' cannot be written to the database!"
  },
 handlerEvents: {
    userBanned: "تم حظر هذا المستخدم من استخدام البوت\n» السبب: %1\n» الوقت: %2\n» معرف المستخدم: %3",
    threadBanned: "تم حظر هذه المجموعة من استخدام البوت\n» السبب: %1\n» الوقت: %2\n» معرف المجموعة: %3",
    onlyAdminBox: "هذه المجموعة مفعّل فيها فقط مشرفو المجموعة يمكنهم استخدام البوت",
    onlyAdminBot: "❌ | حالياً فقط مشرف البوت يمكنه استخدام البوت",
    commandNotFound: "⚜️ هاذ الأمر ماكاينش أ لالة دنيا🙏 ",
    commandNotFound2: "🚫 عذراً، الأمر الذي أدخلته غير صحيح. يمكنك استخدام `/اوامر` لمعرفة الأوامر المتاحة.",
    commandSyntaxError: "شوف طريقة الاستخدام اولا👍😎",
    onlyAdmin: "❌ | فقط مشرفو المجموعة يمكنهم استخدام الأمر \"%1\"",
    onlyAdminToUseOnReply: "❌ | فقط مشرفو المجموعة يمكنهم استخدام وظيفة الرد على الأمر \"%1\"",
    onlyAdminToUseOnReaction: "❌ | فقط مشرفو المجموعة يمكنهم استخدام وظيفة التفاعل على الأمر \"%1\"",
    onlyAdminBot2: "❌ | فقط مشرف البوت يمكنه استخدام الأمر \"%1\"",
    onlyAdminBot2ToUseOnReply: "❌ | فقط مشرف البوت يمكنه استخدام وظيفة الرد على الأمر \"%1\"",
    onlyAdminBot2ToUseOnReaction: "❌ | فقط مشرف البوت يمكنه استخدام وظيفة التفاعل على الأمر \"%1\"",
    waitingForCommand: "⏱ أنت في فترة انتظار لاستخدام هذا الأمر، يرجى العودة بعد %1 ثانية",
    errorOccurred: "❌ [ %1 ]\nحدث خطأ في الأمر \"%2\"\n\n%3",
    errorOccurred2: "❌ [ %1 ]\nحدث خطأ أثناء onChat في الأمر \"%2\"\n\n%3",
    errorOccurred3: "❌ [ %1 ]\nحدث خطأ أثناء onReply في الأمر \"%2\"\n\n%3",
    errorOccurred4: "❌ [ %1 ]\nحدث خطأ أثناء onReaction في الأمر \"%2\"\n\n%3",
    errorOccurred5: "❌ [ %1 ]\nحدث خطأ أثناء onEvent في الأمر \"%2\"\n\n%3",
    errorOccurred6: "❌ [ %1 ]\nحدث خطأ أثناء onEvent في الأمر \"%2\"\n\n%3",
    errorOccurred7: "❌ [ %1 ]\nحدث خطأ أثناء onAnyEvent في الأمر \"%2\"\n\n%3",
    cannotFindCommandName: "❌ لا يمكن العثور على اسم الأمر لتنفيذ الرد!",
    cannotFindCommand: "❌ لا يمكن العثور على الأمر \"%1\" لتنفيذ هذا الرد!"
  },
  autoUptime: {
    autoUptimeTurnedOn: "AutoUptime mode turned on"
  },
  indexController: {
    connectingMongoDB: "Connecting a MONGODB database",
    connectMongoDBSuccess: "Successfully connected mongodb database!",
    connectMongoDBError: "An error occurred when connecting the Mongodb database:",
    connectingMySQL: "Connecting a SQLITE database",
    connectMySQLSuccess: "Successfully connected SQLITE database!",
    connectMySQLError: "An error occurred while connecting to a SQLITE database:"
  },
  updater: {
    updateTooFast: "Please wait at least 5 minutes after the latest commit to update without error, %1 minutes %2 seconds left",
    latestVersion: "You are using the latest version",
    cantFindVersion: "You are using an undefined version (%1), please check your package.json file again",
    newVersions: "There are %1 new versions to update, starting to update...",
    updateSuccess: "Update successfully%1",
    configChanged: "The %1 has been changed, please check your config.json file again",
    installingPackages: "Installing dependencies for bot...",
    installSuccess: "Installed dependencies successfully, restart the bot to use the new version",
    backupSuccess: "Successfully backed up changed files, see in the %1 folder",
    restartToApply: ". Restart the bot to apply the new version",
    skipFile: "There is a new version of the %1 file, but you have skipped this file during the update process with the comment %2 in this file"
  },
  verifyfbid: {
    sendCode: "Your verification code is:\n%1\nThe verification code is valid for %2 minutes"
  },
  utils: {
    errorOccurred: "❌ An error occurred:\n\n%1"
  },
  command: {
    restartedBot: "Bot has been restarted"
  },
  app: {
    googleApiRefreshTokenExpired: "Google API refresh token has expired or been revoked, please get a new token at https://developers.google.com/oauthplayground/",
    tooManyRequests: "Too many requests in the last minute. Please try again later.",
    notPermissionChangeFbstate: "You do not have permission to change fbstate!",
    notFoundFbstate: "Please enter fbstate!",
    changedFbstateSuccess: "Successfully changed fbstate!",
    serverError: "Server an error, please try again later!"
  }
};
