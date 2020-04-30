/*
 * Main node.js server to handle robot routing, commands, and webpage
 */

/*
 * Robot network related stuff
 */

var robot_port = 18748;
var number_of_robots_connected = 0;
var robot_socket_to_name_map = {};
var robot_name_to_socket_map = {};
var robot_name_to_package_map = {};
var robot_name_to_location_map = {};
var grid_x = {};
var grid_y = {};
var package_priority_map = {};

grid_x["535675589"] = 0;
grid_y["535675589"] = 0;

grid_x["113308327"] = 0;
grid_y["113308327"] = 1;

grid_x["1055072771"] = 0;
grid_y["1055072771"] = 2;

grid_x["1147786727"] = 0;
grid_y["1147786727"] = 3;

grid_x["627391382"] = 0;
grid_y["627391382"] = 4;

grid_x["1133104039"] = 1;
grid_y["1133104039"] = 0;

grid_x["588935188"] = 1;
grid_y["588935188"] = 1;

grid_x["1150905447"] = 1;
grid_y["1150905447"] = 2;

grid_x["1130577591"] = 1;
grid_y["1130577591"] = 3;

grid_x["2544717545"] = 1;
grid_y["2544717545"] = 4;

grid_x["4107721102"] = 2;
grid_y["4107721102"] = 0;

grid_x["4108423614"] = 2;
grid_y["4108423614"] = 1;

grid_x["3772508318"] = 2;
grid_y["3772508318"] = 2;

grid_x["3772957566"] = 2;
grid_y["3772957566"] = 3;

grid_x["4233326606"] = 2;
grid_y["4233326606"] = 4;

grid_x["4233200254"] = 3;
grid_y["4233200254"] = 0;

grid_x["3771588974"] = 3;
grid_y["3771588974"] = 1;

grid_x["3772872318"] = 3;
grid_y["3772872318"] = 2;

grid_x["3771960558"] = 3;
grid_y["3771960558"] = 3;

grid_x["4232304222"] = 3;
grid_y["4232304222"] = 4;

grid_x["3772049294"] = 4;
grid_y["3772049294"] = 0;

grid_x["4233218926"] = 4;
grid_y["4233218926"] = 1;

grid_x["4108146382"] = 4;
grid_y["4108146382"] = 2;

grid_x["4108285310"] = 4;
grid_y["4108285310"] = 3;

grid_x["4109040878"] = 4;
grid_y["4109040878"] = 4;

package_priority_map["3250476329"] = 1;
package_priority_map["3250673033"] = 2;
package_priority_map["3241530569"] = 3;
package_priority_map["3260105849"] = 4;

const robot_io = require("socket.io");
const robot_server = robot_io.listen(robot_port);

function package_handler(socket, payload)
{
  console.log("%s : package message with payload : %s", robot_socket_to_name_map[socket.id], payload);
  payload = payload.split(" "); //[0]=robot_id [1]=package_id
  if (!robot_socket_to_name_map[socket.id]) // first time seeing robot
  {
    number_of_robots_connected++;
    console.log("New robot...establishing adding to socket map");
    robot_socket_to_name_map[socket.id] = payload[0];
    robot_name_to_socket_map[payload[0]] = socket;
  }
  robot_name_to_package_map[payload[0]] = payload[1];
  console.log("%s package priority is %d", payload[0], package_priority_map[payload[1]]);
};

function position_handler(socket, payload)
{
  console.log("%s : position message with payload : %s", robot_socket_to_name_map[socket.id], payload);
  payload = payload.split(" "); //[0]=robot_id [1]=position_id
  if (!robot_socket_to_name_map[socket.id]) // first time seeing robot
  {
    number_of_robots_connected++;
    console.log("New robot...establishing adding to socket map");
    robot_socket_to_name_map[socket.id] = payload[0];
    robot_name_to_socket_map[payload[0]] = socket;
  }
  robot_name_to_location_map[payload[0]] = payload[1];
  console.log("%s position is (%d,%d)", payload[0], grid_x[payload[1]], grid_y[payload[1]]);
};


function update_position_handler(socket, payload)
{
  console.log("%s : Recieved package with payload : %s", robot_socket_to_name_map[socket.id], payload);
  payload = payload.split(" ");
  var position = JSON.parse(payload[1].replace(/\(/g, "[").replace(/\)/g, "]"));
  robot_name_to_location_map[payload[0]] = position;
};

/*
 * Socket handling for robot
 */
robot_server.on("connection", (socket) =>
{
  console.log("Client connected with socket id : %s", socket.id);

  socket.on("identify", (data) =>
  {
    identify_handler(socket, data);
  });

  socket.on("package", (data) =>
  {
    package_handler(socket, data);
  });

  socket.on("position", (data) =>
  {
    position_handler(socket, data);
  });

  socket.on("update_position", (data) =>
  {
    update_position_handler(socket, data);
  });

  // TODO handle disconnect
});

/*
 * Webpage related stuff
 */

var app = require("express")();
var http = require("http").createServer(app);
var webpage_port = 80;
var webpage_io = require("socket.io")(http);
var web_page_refresh_interval = 2000;

/*
 * Serve index html
 */
app.get("/", function(req, res){
  res.sendFile(__dirname + "/index.html");
});

/*
 * Socket handling for webpage
 */
webpage_io.on('connection', (socket) =>
{
  console.log("Webpage accessed");

  socket.on("move", (data) =>
  {
    console.log("User requested move");
    data = data.split(" ");
    if (robot_name_to_socket_map[data[0]])
    {
      console.log("Sending move to %s", data[0]);
      robot_name_to_socket_map[data[0]].emit("move", "(" + data[1] + "," + data[2] + ")");
    }
  });

  socket.on("blink", (data) =>
  {
    console.log("User requested blink");
    console.log("Blink not implemented in node");
    /*
    if (robot_name_to_socket_map[data])
    {
      console.log("Sending blink to %s", data);
      robot_name_to_socket_map[data].emit("blink", "Blink payload here");
    }
    */
  });

  setInterval(function()
  {
    var arr = [];
    var key_list = Object.keys(robot_name_to_socket_map);
    for (var i = 0; i < number_of_robots_connected; i++)
    {
      if (robot_name_to_package_map[key_list[i]] && robot_name_to_location_map[key_list[i]])
      {
        arr.push([key_list[i], grid_x[robot_name_to_location_map[key_list[i]]], grid_y[robot_name_to_location_map[key_list[i]]], package_priority_map[robot_name_to_package_map[key_list[i]]]]);
      }
    }
    socket.emit("status", arr);
  }, web_page_refresh_interval);
});

/*
 * Serve on port 80
 */
http.listen(webpage_port, function(){
  console.log("Webpage started at %s", webpage_port);
});
