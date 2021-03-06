var express = require('express');
var async=require('async');
var router = express.Router();

//var mysql_odbc = require('../config/db_conn')();
//var conn = mysql_odbc.init();
var mysqlDB = require('../config/db_conn')

const _MAX = 9999;
const _MIN = -9999;
const CPU=true;
const AMBIENT=false;
const CPU_DOWNTIME = [268,265,263,260,257,255,252,249,247,244,241,238,236,233,230,228,225,222,220,217,214,211,209,206,203,201,198,195,192,190,187,184,182,179,176,174,171,168,165,163,160,157,155,152,149,147,144,141,138,136,133,130,128,125,122,120,117,114,111,109,106,103,101,98,95,93,90,87,84,79,76,74,71,68,65,63,60,57,55,52,49,47,44,41,37,36,33,29,28,25,22,20,17,14,11,9,6,3,1,0];
const AMBIENT_DOWNTIME = [109,108,107,106,105,104,103,101,100,99,98,97,96,95,94,93,92,90,89,88,87,86,85,84,83,82,81,79,78,77,76,75,74,73,72,71,70,68,67,66,65,64,63,62,61,60,59,57,56,55,54,53,52,51,50,49,48,47,45,44,43,42,41,40,39,38,37,36,34,33,32,31,30,29,28,27,26,25,23,22,21,20,19,18,17,16,15,14,12,11,10,9,8,7,6,5,4,3,1,0];


function getDateTime(){
    var date = new Date();
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return "'"+year + "-" + month + "-" + day+ " " + hour + ":" + min+":"+sec+"'";
}

function getQueryInUppercase(query) {
  return "'" + String(query).toUpperCase() + "'";
}

function calc_Ratio(input,threshold){
  return parseInt((input/threshold)*100);
}

function calc_Downtime(input,flag){//if flag==true CPU else AMBIENT
  if(input>=100)return 0;
  if(input<0)return _MAX;
  if(flag)return CPU_DOWNTIME[input];
  return AMBIENT_DOWNTIME[input];
}

function Server_CpuAmbDivide(results,array,simparam){
  var id_hostname=array[0]; var id_servertime=array[1];
  var cpu=array[2]; var cpuRatio=array[3]; var cpuDowntime=array[4]; var ambient=array[5]; var ambientRatio=array[6]; var ambientDowntime=array[7];
  var fan=array[8]; var power=array[9];
  var curr = results.rows[0];
  var value = parseInt(curr._value)+simparam;
  var id = parseInt(curr._id);

  if(results.name.match(new RegExp("^CPU"))||results.name.match(new RegExp("^AMBIENT"))){
    var hostname = curr._hostname;
    var servertime = curr._servertime;
    var threshold=parseInt(curr._threshold);
    var ratio = calc_Ratio(value,threshold);
    var downtime;
    id_hostname[id] = hostname;
    id_servertime[id]= servertime;
   if(results.name.match(new RegExp("^CPU"))) {
      downtime = calc_Downtime(ratio,CPU);
      cpu[id] = (id in cpu) ? Math.max(cpu[id], value) : value;
      cpuRatio[id] = (id in cpuRatio) ? Math.max(cpuRatio[id], ratio) : ratio;
      cpuDowntime[id] = (id in cpuDowntime) ? Math.min(cpuDowntime[id], downtime) : downtime;
   }else if(results.name.match(new RegExp("^AMBIENT"))){
      downtime = calc_Downtime(ratio,AMBIENT);
      ambient[id] = (id in ambient) ? Math.max(ambient[id], value) : value;
      ambientRatio[id] = (id in ambientRatio) ? Math.max(ambientRatio[id], ratio) : ratio;
      ambientDowntime[id] = (id in ambientDowntime) ? Math.min(ambientDowntime[id], downtime) : downtime;
      }
    }
    else if(results.name.match(new RegExp("^FAN"))){
      fan[id] = (id in fan) ? Math.max(fan[id],value) : value;
    }
    else if(results.name.match(new RegExp("^POWER"))){
      power[id] = (id in power) ? Math.max(power[id],value) : value;
    }
  }

function indexingResults(array,api_array) {
  var id_hostname=array[0]; var id_servertime=array[1];
  var cpu=array[2]; var cpuRatio=array[3]; var cpuDowntime=array[4]; var ambient=array[5]; var ambientRatio=array[6]; var ambientDowntime=array[7];
  var fan=array[8]; var power=array[9];
  var serverId=api_array[0]; var serverName=api_array[1]; var serverTime=api_array[2];
  var tempCpu=api_array[3]; var tempRatioCpu=api_array[4]; var tempDowntimeCpu=api_array[5];
  var tempAmbient=api_array[6]; var tempRatioAmbient=api_array[7]; var tempDowntimeAmbient=api_array[8];
  var tempFan=api_array[9]; var tempPower=api_array[10];
  var numberOfInfluxServer = Object.keys(id_hostname).length;
  for (var i = 0; i < numberOfInfluxServer; i++) {
    var nowId = Object.keys(id_hostname)[i];
    serverName.push(id_hostname[nowId]);
    serverId.push(nowId);
    serverTime.push(id_servertime[nowId]);
    (nowId in cpu) ? tempCpu.push(cpu[nowId]): tempCpu.push(_MIN);
    (nowId in cpuRatio) ? tempRatioCpu.push(cpuRatio[nowId]): tempRatioCpu.push(_MIN);
    (nowId in cpuDowntime) ? tempDowntimeCpu.push(cpuDowntime[nowId]): tempDowntimeCpu.push(_MAX);
    (nowId in ambient) ? tempAmbient.push(ambient[nowId]): tempAmbient.push(_MIN);
    (nowId in ambientRatio) ? tempRatioAmbient.push(ambientRatio[nowId]): tempRatioAmbient.push(_MIN);
    (nowId in ambientDowntime) ? tempDowntimeAmbient.push(ambientDowntime[nowId]): tempDowntimeAmbient.push(_MAX);
    (nowId in fan) ? tempFan.push(fan[nowId]) : tempFan.push(_MIN);
    (nowId in power) ? tempPower.push(power[nowId]) : tempPower.push(_MIN);
  }
}

function Rackid_Mapping(rackid,doubleArray,check,index,input){
  if(rackid in check){
    var i=check[rackid];
    doubleArray[i].add(input);
  }
  else{
    check[rackid]=index++;
    var tmp=new Set();
    tmp.add(input);
    doubleArray.push(tmp);
  }
  return index;
}

function Rack_CpuAmbDivide(results,array,max_arry,saveComplexity,simparam){
  var rackid_rack=saveComplexity[0]; var doubleArrayServer=saveComplexity[1]; var check_server=saveComplexity[2];
  var id_hostname=array[0]; var cpu=array[1]; var cpuRatio=array[2]; var cpuDowntime=array[3]; var ambient=array[4]; var ambientRatio=array[5]; var ambientDowntime=array[6];
  var rackid_id_Cpu=max_arry[0]; var rackid_id_Amb=max_arry[1]; var rackid_id_CpuDowntime=max_arry[2]; var rackid_id_AmbDowntime=max_arry[3];
  var curr = results.rows[0];
  var rack=curr._rack;
  var hostname = curr._hostname;
  var threshold=parseInt(curr._threshold);
  var value = parseInt(curr._value)+simparam;
  var ratio = calc_Ratio(value,threshold);
  var downtime;
  var id = parseInt(curr._id);
  var rackid=parseInt(curr._rackid);

  if(!(id in id_hostname))saveComplexity[3]=Rackid_Mapping(rackid,doubleArrayServer,check_server,saveComplexity[3],hostname);
  id_hostname[id] = hostname;
  rackid_rack[rackid]=rack;

  if (results.name.match(new RegExp("^CPU"))) {
    downtime = calc_Downtime(ratio,CPU);
    cpu[id] = (id in cpu) ? Math.max(cpu[id], value) : value;
    cpuRatio[id] = (id in cpuRatio) ? Math.max(cpuRatio[id], ratio) : ratio;
    cpuDowntime[id] = (id in cpuDowntime) ? Math.min(cpuDowntime[id], downtime) : downtime;
    rackid_id_Cpu[rackid]=(rackid in rackid_id_Cpu) ? Math.max(rackid_id_Cpu[rackid],cpu[id]) : cpu[id];
    rackid_id_CpuDowntime[rackid]=(rackid in rackid_id_CpuDowntime) ? Math.min(rackid_id_CpuDowntime[rackid],cpuDowntime[id]) : cpuDowntime[id];
  } else {
    downtime = calc_Downtime(ratio,AMBIENT);
    ambient[id] = (id in ambient) ? Math.max(ambient[id], value) : value;
    ambientRatio[id] = (id in ambientRatio) ? Math.max(ambientRatio[id], ratio) : ratio;
    ambientDowntime[id] = (id in ambientDowntime) ? Math.min(ambientDowntime[id], downtime) : downtime;
    rackid_id_Amb[rackid]=(rackid in rackid_id_Amb) ? Math.max(rackid_id_Amb[rackid],ambient[id]) : ambient[id];
    rackid_id_AmbDowntime[rackid]=(rackid in rackid_id_AmbDowntime) ? Math.min(rackid_id_AmbDowntime[rackid],ambientDowntime[id]) : ambientDowntime[id];
  }
}

router.get('/v1/servers', function(req, res, next) {
  var site = getQueryInUppercase(req.query.site);
  var floor = getQueryInUppercase(req.query.floor);
  var number = (req.query.number==undefined)?'1':getQueryInUppercase(req.query.number);
  var simparam=(req.query.simparam==undefined)?0:parseInt(req.query.simparam);
  var id_hostname = {}; var id_servertime = {} ;
  var cpu = {}; var cpuRatio = {}; var cpuDowntime = {}; var ambient = {};  var ambientRatio = {}; var ambientDowntime = {};
  var fan = {}; var power = {};//Unused
  /* API Send body */
  var serverId = []; var serverName = []; var serverTime = [];
  var tempCpu = []; var tempRatioCpu = []; var tempDowntimeCpu = [];
  var tempAmbient = []; var tempRatioAmbient = []; var tempDowntimeAmbient = [];
  var tempFan = []; var tempPower = [];//Unused
  /* API Send body */
  var result_code = 1;
  var result_msg = "success";
  var array=[id_hostname,id_servertime,cpu,cpuRatio,cpuDowntime,ambient,ambientRatio,ambientDowntime,fan,power];
  var api_array=[serverId,serverName,serverTime,tempCpu,tempRatioCpu,tempDowntimeCpu,tempAmbient,tempRatioAmbient,tempDowntimeAmbient,tempFan,tempPower];
  var query = "";

  /** Check the existence of the floor parameter */
  query = 'select last(_servertime), _servertime,_id,_hostname,_value,_ratio,_downtime,_threshold '+
  'from AMBIENT,CPU0,CPU1,CPU2,CPU3,CPU4 where time>now()-6m and _site=' + site;
  (req.query.floor== undefined)?query+=' group by(_id)':query+=' and _floor='+floor+' group by(_id)';

  influxDB.query(query).then(results => {
    results.groups().forEach(results => {
        Server_CpuAmbDivide(results,array,simparam)
    });
    indexingResults(array,api_array)

    var final = {
      serverId: serverId,
      serverName: serverName,
      serverTime: serverTime,
      tempCpu: tempCpu,
      tempRatioCpu: tempRatioCpu,
      downtimeCpu: tempDowntimeCpu,
      tempAmbient: tempAmbient,
      tempRatioAmbient: tempRatioAmbient,
      downtimeAmb: tempDowntimeAmbient
    };
    var result = {
      result_code: result_code,
      result_msg: result_msg,
      result: final
    };
    res.send(JSON.stringify(result));
  });
});



router.get('/v1/servers/:serverId', function(req, res, next) {
  var _serverId = "'" + req.params.serverId + "'";
  var simparam=(req.query.simparam==undefined)?0:parseInt(req.query.simparam);
  var id_hostname = {}; var id_servertime = {};
  var cpu = {}; var cpuRatio = {}; var cpuDowntime = {}; var ambient = {};  var ambientRatio = {}; var ambientDowntime = {}; var fan = {}; var power = {};
  /* API Send body */
  var serverId = []; var serverName = []; var serverTime = [];
  var tempCpu = []; var tempRatioCpu = []; var tempDowntimeCpu = [];
  var tempAmbient = []; var tempRatioAmbient = []; var tempDowntimeAmbient = [];
  var tempFan = []; var tempPower = [];
  /* API Send body */
  var result;
  var result_code = 1;
  var result_msg = "success";
  var array=[id_hostname,id_servertime,cpu,cpuRatio,cpuDowntime,ambient,ambientRatio,ambientDowntime,fan,power];
  var api_array=[serverId,serverName,serverTime,tempCpu,tempRatioCpu,tempDowntimeCpu,tempAmbient,tempRatioAmbient,tempDowntimeAmbient,tempFan,tempPower];

  async.parallel([
    function(callback){
      var query="";
      query+='select last(_servertime), _servertime,_id,_hostname,_value,_ratio,_downtime,_threshold from AMBIENT,CPU0,CPU1,CPU2,CPU3,CPU4 ' +
      'where time>now()-6m and _id=' + _serverId + ' group by(_id);';
      query+='select last(_servertime), _value,_id from FAN,POWER where time>now()-6m and _id=' + _serverId + 'group by(_id);';
      influxDB.query(query).then(results=> {
        results.forEach(results=>{
          results.groups().forEach(results => {
            Server_CpuAmbDivide(results,array,simparam)
          });
        });
        indexingResults(array,api_array);
        var json = {
          serverId: serverId,
          serverName: serverName,
          serverTime: serverTime,
          tempCpu: tempCpu,
          tempRatioCpu: tempRatioCpu,
          downtimeCpu: tempDowntimeCpu,
          tempAmbient: tempAmbient,
          tempRatioAmbient: tempRatioAmbient,
          downtimeAmb: tempDowntimeAmbient,
          fan:tempFan,
          power:tempPower
        };
        callback(null,json);
      });
    },
    function(callback){
      mysqlDB.query('SELECT DISTINCT C_MAIN,C_SUB,MEMO,TIME,HOST_NAME FROM DEVICE_DESC inner join DEVICE_INFO on DEVICE_DESC.DEVICE_ID=DEVICE_INFO.ID WHERE DEVICE_ID='+_serverId,
        function(error, results, fields) {
          if (error) {
            console.log(error);
          }else {
            if(!results.length)json= {};
            else
            var json={
              c_main:results[0].C_MAIN,
              c_sub:results[0].C_SUB,
              memo:results[0].MEMO,
              time:results[0].TIME,
              name:results[0].HOST_NAME
            };
          callback(null,json);
          };
        }
      )
    }],
  function(err,results){
    if(err)console.log(err);
    results[0].serverName=[results[1].name];
    delete results[1].name;
    results[0].memo=results[1];

    var result = {
      result_code: result_code,
      result_msg: result_msg,
      result:results[0]
      };
    res.send(JSON.stringify(result));
    });
  });

router.put('/v1/servers/:serverId',function(req, res, next){
  var c_main=getQueryInUppercase(req.body.c_main);
  var c_sub=getQueryInUppercase(req.body.c_sub);
  var memo=getQueryInUppercase(req.body.memo);
  mysqlDB.query('INSERT INTO DEVICE_DESC (DEVICE_ID,MEMO,C_MAIN,C_SUB,TIME) VALUES ('+getQueryInUppercase(req.params.serverId)+','+memo+','+c_main+','+c_sub+','+getDateTime()+')'+
  ' ON DUPLICATE KEY UPDATE DEVICE_ID='+getQueryInUppercase(req.params.serverId)+',MEMO='+memo+',C_MAIN='+c_main+',C_SUB='+c_sub+',TIME='+getDateTime(),
    function(error, results, fields) {
      if (error) {
        console.log(error);
      }else {
        var result_code = 1;
        var result_msg = "success";
        var result={
          result_code:result_code,
          result_msg:result_msg
        };
        res.send(JSON.stringify(result));
      };
    }
  )
})

router.get("/v1/servers/:serverId/stat", function(req, res, next){
  var serverId = "'" + req.params.serverId + "'";
  var result;
  var result_code = 1;
  var result_msg = "success";
  var statJson = {
    cpu: {},
    amb: {}
  };

  influxDB.query('select _id,_servertime,_value,_ratio,_downtime from CPU0,CPU1,CPU2,CPU3,CPU4,AMBIENT where time>now()-6h and _id='+ serverId).then(results => {
    results.groups().forEach(function(e){
      /** Check if it starts with "CPU" */
      if (e.name.match(new RegExp('^CPU'))) {
        e.rows.forEach(function(row){
          /** find maximum value of cpu temperature and minimum value of cpu downtime (because of multiple cpu sensors) */
          if(statJson.cpu[row._servertime] == undefined || statJson.cpu[row._servertime].value < row._value){
            statJson.cpu[row._servertime] = {
              value: row._value,
              downtime: row._downtime,
              ratio: row._ratio
            };
          }
        });
      } else {
        e.rows.forEach(function(row){
          statJson.amb[row._servertime] = {
            value: row._value,
            downtime: row._downtime,
            ratio: row._ratio
          };
        });
      }
    });
    var result = {
      result_code: result_code,
      result_msg: result_msg,
      result: statJson
    };
    res.send(JSON.stringify(result));
  });
});

router.get('/v1/racks/', function(req, res, next) {
  var site = getQueryInUppercase(req.query.site);
  var floor = getQueryInUppercase(req.query.floor);
  var number = (req.query.number==undefined)?'1':getQueryInUppercase(req.query.number);
  var simparam=(req.query.simparam==undefined)?0:parseInt(req.query.simparam);
  /* server present temperature */
  var id_hostname = {}; var ambient = {}; var cpu = {}; var ambientRatio = {};  var cpuRatio = {}; var ambientDowntime = {};  var cpuDowntime = {};
  /* server present temperature */

  /* rack present temperature */
  var rackid_id_Cpu={};
  var rackid_id_Amb={};
  var rackid_id_CpuDowntime={};
  var rackid_id_AmbDowntime={};
  /* rack present temperature */

  /* Save Complexity */
  var rackid_rack={};
  var doubleArrayServer=new Array();
  var check_server={};//serverindex
  var index_server=0;
  var doubleArrayCoordi=new Array();
  var check_coordi={};
  var index_coordi=0;
  /* Save Complexity */

  /* API send body */
  var coordinates = [];
  var cpuTempMax = [];
  var ambTempMax = [];
  var rackName = [];
  var rackServer = [];
  var rackId = [];
  var downtimeCpu = [];
  var downtimeAmb = [];
  /* API send body */

  /* Function input */
  var array=[id_hostname,cpu,cpuRatio,cpuDowntime,ambient,ambientRatio,ambientDowntime];
  var max_array=[rackid_id_Cpu,rackid_id_Amb,rackid_id_CpuDowntime,rackid_id_AmbDowntime];
  var saveComplexity=[rackid_rack,doubleArrayServer,check_server,index_server];
  /* Function input */

  var result_code = 1;
  var result_msg = "success";

  var final = {
    coordinates: coordinates,
    cpuTempMax: cpuTempMax,
    ambTempMax: ambTempMax,
    downtimeCpu: downtimeCpu,
    downtimeAmb: downtimeAmb,
    rackName: rackName,
    rackServer: rackServer,
    rackId: rackId
  };
  var result = {
    result_code: result_code,
    result_msg: result_msg,
    result: final
  };

  influxDB.query('select last(_servertime), _rackid,_rack,_id,_hostname,_value,_ratio,_downtime,_threshold from AMBIENT,CPU0,CPU1,CPU2,CPU3,CPU4 ' +
    'where time>now()-6m and _site=' + site + ' and _floor=' + floor + ' group by(_id)').then(results => {
    results.groups().forEach(results => {
          Rack_CpuAmbDivide(results,array,max_array,saveComplexity,simparam);
      });

    query="(" // Make In Query
    var dict=Object.keys(rackid_rack);
    for(var i=0; i<dict.length; i++)
    query=(i==dict.length-1)?query+dict[i]:query+dict[i]+",";
    query+=")";

    if(dict.length)
    mysqlDB.query('SELECT DISTINCT RACK_ID,X_COORDI,Y_COORDI FROM DRAW_INFO WHERE RACK_ID IN'+query,
      function(error, results, fields) {
        if (error) {
          console.log(error);
        } else {
          results.forEach(results => {
            var rackid=results.RACK_ID;
            var input="x"+results.X_COORDI+"y"+results.Y_COORDI;
            index_coordi=Rackid_Mapping(rackid,doubleArrayCoordi,check_coordi,index_coordi,input);
          });

          for(var i=0; i<Object.keys(rackid_rack).length; i++){//Indexing
            var rackid=Object.keys(rackid_rack)[i]; var rack=rackid_rack[rackid];
            cpuTempMax.push(rackid_id_Cpu[rackid]);
            ambTempMax.push(rackid_id_Amb[rackid]);
            downtimeCpu.push(rackid_id_CpuDowntime[rackid]);
            downtimeAmb.push(rackid_id_AmbDowntime[rackid]);
            rackName.push(rack);
            rackId.push(rackid);
            coordinates.push(doubleArrayCoordi[check_coordi[rackid]].toArray());
            rackServer.push(doubleArrayServer[check_server[rackid]].toArray());
          }
          res.send(JSON.stringify(result));
        }
      });
      else res.send(JSON.stringify(result));
  });
});


router.get('/v1/racks/:rackId', function(req, res, next) {
  var simparam=(req.query.simparam==undefined)?0:parseInt(req.query.simparam);
  var json = {};
  var result_code = 1;
  var result_msg = "success";

  if(req.params.rackId == "undefined" || req.params.rackId == undefined){
    result_code = 0;
    result_msg = "No recieved rackId";
    json = {
      result_code : result_code,
      result_msg : result_msg,
      result : {}
    };
    return JSON.stringify(json);
  }

  mysqlDB.query('SELECT * FROM DEVICE_INFO WHERE RACK_ID=' + req.params.rackId, function(error, results, fields) {
    if (error) {
      console.log(error);
    } else {
      var serverId = []; var rackServer = []; var serverHole = []; var serverBay = []; var rackName = "";
      var query = "";
      var result = {};

      results.forEach(result => {
        serverId.push(result.ID);
        rackServer.push(result.HOST_NAME);
        serverHole.push([result.HOLE_S, result.HOLE_E]);
        serverBay.push(result.BAY);
        rackName = result.RACK;
        query = query + 'select last(_servertime), _id,_rack,_ip,_value,_hostname,_ratio,_downtime,_threshold from AMBIENT,CPU0,CPU1,' +
          'CPU2,CPU3,CPU4 where time>now()-6m and _id=' + getQueryInUppercase(result.ID) + ';';
      });

      /** If there is no server in the rack send failure json response */
      if (serverId.length == 0) return res.send(JSON.stringify({
        result_code: 0,
        result_msg: "Failed : No matched data",
        result: {}
      }));

      influxDB.query(query).then(results => {
        var cpuTempMax = [];
        var ambTempMax = [];
        var cpuRatioMax = [];
        var ambRatioMax = [];
        var downtimeCpu = [];
        var downtimeAmb = [];
        /** (serverId.length == 1) means single query is executed as there is a server in the rack */
        /** Wrap the result to handle errors caused by non-array format */
        if (serverId.length == 1) results = [results];
        results.forEach(function(e) {
          var cpuTemp, ambTemp, cpuDt, ambDt , cpuRatio, ambRatio;
          e.groups().forEach(function(a) {
            /** Check if it starts with "CPU" */
            if (a.name.match(new RegExp('^CPU'))) {
              /** find maximum value of cpu temperature and minimum value of cpu downtime (because of multiple cpu sensors */
              if (cpuTemp == undefined || cpuTemp < a.rows[0]._value+simparam) cpuTemp = a.rows[0]._value+simparam;
              if (cpuRatio == undefined || cpuRatio < calc_Ratio(a.rows[0]._value+simparam,a.rows[0]._threshold)) cpuRatio = calc_Ratio(a.rows[0]._value+simparam,a.rows[0]._threshold)
              if (cpuDt == undefined || cpuDt > calc_Downtime(calc_Ratio(a.rows[0]._value+simparam,a.rows[0]._threshold),CPU)) cpuDt = calc_Downtime(calc_Ratio(a.rows[0]._value+simparam,a.rows[0]._threshold),CPU);
            } else {
              ambTemp = a.rows[0]._value+simparam;
              ambRatio = calc_Ratio(a.rows[0]._value+simparam,a.rows[0]._threshold)
              ambDt = calc_Downtime(calc_Ratio(a.rows[0]._value+simparam,a.rows[0]._threshold),AMBIENT);
            }
          });
          cpuTempMax.push(cpuTemp);
          ambTempMax.push(ambTemp);
          cpuRatioMax.push(cpuRatio);
          ambRatioMax.push(ambRatio);
          downtimeCpu.push(cpuDt);
          downtimeAmb.push(ambDt);
        });
        result = {
          serverId: serverId,
          rackServer: rackServer,
          serverHole: serverHole,
          serverBay: serverBay,
          rackName: rackName,
          rackId: req.params.rackId,
          cpuTempMax: cpuTempMax,
          ambTempMax: ambTempMax,
          cpuRatioMax: cpuRatioMax,
          ambRatioMax: ambRatioMax,
          downtimeCpu: downtimeCpu,
          downtimeAmb: downtimeAmb
        };
        json = {
          result_code: result_code,
          result_msg: result_msg,
          result: result
        };
        res.send(JSON.stringify(json));
      });
    }
  });
});

router.get('/v1/summary/all/current', function(req, res, next) {
  var site = getQueryInUppercase(req.query.site);
  var result;
  var result_code = 1;
  var result_msg = "success";
  var query="";
  var loc=(req.query.site==undefined)?"":'_location='+site+' and ';
// ### START : SERVICE CODE ###
  // query+='select last(_servertime), _rack,_rackid,_hostname,_id,_floor,_value,_ratio,_downtime from CPU0,CPU1,CPU2,CPU3,CPU4,AMBIENT'+
  //  ' where time>now()-6m and _site=' + site + ' group by(_id);';
   query+='select last(_servertime), _rack,_rackid,_hostname,_id,_floor,_value,_threshold,_downtime,_status,_jump_status,_jump_value,_old_value from CPU0,CPU1,CPU2,CPU3,CPU4,AMBIENT'+
 ' where time>now()-6m and _site=' + site + ' group by(_id);';
// ### END : SERVICE CODE ###

// ### START : TEST CODE ###
/*
  query+='select last(_servertime), _rack,_rackid,_hostname,_id,_floor,_value,_ratio,_downtime from CPU0,CPU1,CPU2,CPU3,CPU4,AMBIENT'+
   ' where _site=' + site + ' group by(_id);';
*/
// ### END : TEST CODE ###

  query+='select * from COOLER where '+loc+' time>now()-6h group by(_id);';

  influxDB.query(query).then(results => {
    var cpuDown_check={}; var cpuDown_value=[]; var cpuDown_serverName=[]; var cpuDown_serverId=[]; var cpuDown_floor=[]; var cpuDown_rack=[]; var cpuDown_rackid=[];
    var cpuMax_value=-1; var cpuMax_rem= - 1;
    var cpuRatio_value = -1; var cpuRatio_rem= - 1;
    var ambDown_check={}; var ambDown_value=[]; var ambDown_serverName=[]; var ambDown_serverId=[]; var ambDown_floor=[]; var ambDown_rack=[]; var ambDown_rackid=[];
    var ambMax_value=-1; var ambMax_rem= - 1;
    var cpuJump_check={}; var cpuJump_value=[]; var cpuJump_oldvalue=[]; var cpuJump_jump=[]; var cpuJump_serverName=[]; var cpuJump_serverId=[]; var cpuJump_floor=[]; var cpuJump_rack=[]; var cpuJump_rackid=[]; var cpuJump_status=[];
    var ambJump_check={}; var ambJump_value=[]; var ambJump_oldvalue=[]; var ambJump_jump=[]; var ambJump_serverName=[]; var ambJump_serverId=[]; var ambJump_floor=[]; var ambJump_rack=[]; var ambJump_rackid=[]; var ambJump_status=[];
    var ambRatio_value = -1; var ambRatio_rem= - 1;
    var coolerInfo_class=[]; var coolerInfo_contents=[]; var coolerInfo_location=[]; var coolerInfo_servertime=[];

    results.forEach(results=>{
      results.groups().forEach(results=>{
        if (results.name.match("COOLER")){
          results.rows.forEach(function(e){
            coolerInfo_class.push(e._class);
            coolerInfo_contents.push(e._contents);
            coolerInfo_location.push(e._location);
            coolerInfo_servertime.push(e._servertime);
          });
        }
        else if (results.name.match(new RegExp("^CPU"))){
          // if(cpuMax_value<results.rows[0]._value)cpuMax_value=results.rows[0]._value,cpuMax_rem=results.rows[0];
          // if(cpuRatio_value<results.rows[0]._ratio)cpuRatio_value=results.rows[0]._ratio,cpuRatio_rem=results.rows[0];
          if(results.rows[0]._jump_status!='STABLE')cpuDown_check[results.rows[0]._id]=results.rows[0];
          if(results.rows[0]._status!='STABLE'&&(!(results.rows[0]._id in cpuDown_check)||(cpuDown_check[results.rows[0]._id]._downtime>results.rows[0]._downtime)))cpuDown_check[results.rows[0]._id]=results.rows[0];
        }
        else{
          // if(ambMax_value<results.rows[0]._value)ambMax_value=results.rows[0]._value,ambMax_rem=results.rows[0];
          // if(ambRatio_value<results.rows[0]._ratio)ambRatio_value=results.rows[0]._ratio,ambRatio_rem=results.rows[0];
          if(results.rows[0]._jump_status!='STABLE')ambDown_check[results.rows[0]._id]=results.rows[0];
          if(results.rows[0]._status!='STABLE'&&(!(results.rows[0]._id in ambDown_check)||(ambDown_check[results.rows[0]._id]._downtime>results.rows[0]._downtime)))ambDown_check[results.rows[0]._id]=results.rows[0];
         }
      });
    });
    for(var i=0; i<Object.keys(cpuDown_check).length; i++){
      var id=Object.keys(cpuDown_check)[i]; var curr=cpuDown_check[id];
      cpuDown_value.push(curr._downtime);
      cpuDown_serverName.push(curr._hostname);
      cpuDown_serverId.push(curr._id);
      cpuDown_floor.push(curr._floor);
      cpuDown_rack.push(curr._rack);
      cpuDown_rackid.push(curr._rackid);
    }
    for(var i=0; i<Object.keys(ambDown_check).length; i++){
      var id=Object.keys(ambDown_check)[i]; var curr=ambDown_check[id];
      ambDown_value.push(curr._downtime);
      ambDown_serverName.push(curr._hostname);
      ambDown_serverId.push(curr._id);
      ambDown_floor.push(curr._floor);
      ambDown_rack.push(curr._rack);
      ambDown_rackid.push(curr._rackid);
    }
    for(var i=0; i<Object.keys(cpuJump_check).length; i++){
      var id=Object.keys(cpuJump_check)[i]; var curr=cpuJump_check[id];
      cpuJump_value.push(curr._value);
      cpuJump_oldvalue.push(curr._old_value);
      cpuJump_jump.push(curr._jump_value);
      cpuJump_status.push(curr._jump_status);
      cpuJump_serverName.push(curr._hostname);
      cpuJump_serverId.push(curr._id);
      cpuJump_floor.push(curr._floor);
      cpuJump_rack.push(curr._rack);
      cpuJump_rackid.push(curr._rackid);
    }
    for(var i=0; i<Object.keys(ambJump_check).length; i++){
      var id=Object.keys(ambJump_check)[i]; var curr=ambJump_check[id];
      ambJump_value.push(curr._value);
      ambJump_oldvalue.push(curr._old_value);
      ambJump_jump.push(curr._jump_value);
      ambJump_status.push(curr._jump_status);
      ambJump_serverName.push(curr._hostname);
      ambJump_serverId.push(curr._id);
      ambJump_floor.push(curr._floor);
      ambJump_rack.push(curr._rack);
      ambJump_rackid.push(curr._rackid);
    }

    var cpuDown = {
      value: cpuDown_value,
      rack:  cpuDown_rack,
      rackid: cpuDown_rackid,
      serverName:cpuDown_serverName,
      serverId:cpuDown_serverId,
      floor:cpuDown_floor
    };
    var cpuJump = {
      value: cpuJump_value,
      oldvalue: cpuJump_oldvalue,
      jump: cpuJump_jump,
      rack:  cpuJump_rack,
      rackid: cpuJump_rackid,
      serverName: cpuJump_serverName,
      serverId: cpuJump_serverId,
      floor: cpuJump_floor,
      status: cpuJump_status
    };

/** 2020.01.21 : cpuJump Test Code Add
var cpuJump = {
  value: [22,27],
  oldvalue: [23,26],
  jump: [0.714,0.983],
  rack:  ["A-AK-7","B-AN-4"],
  rackid: ["39","293"],
  serverName: ["LTEPCRF#07","PCRF#06S"],
  serverId: ["321","1388"],
  floor: ["5","5"],
  status: ["MINOR","CRITICAL"]
};
*/

/** 2019.12.27 revision : Deleted for TT Information about cooling system
    var cpuMax = {
      value: cpuMax_value,
      rack: cpuMax_rem._rack,
      rackid: cpuMax_rem._rackid,
      serverName:cpuMax_rem._hostname,
      serverId:cpuMax_rem._id,
      floor:cpuMax_rem._floor,
    };
    var cpuRatio = {
      value: cpuRatio_value,
      rack: cpuRatio_rem._rack,
      rackid: cpuRatio_rem._rackid,
      serverName:cpuRatio_rem._hostname,
      serverId:cpuRatio_rem._id,
      floor:cpuRatio_rem._floor,
    };
*/
    var ambDown = {
      value: ambDown_value,
      rack:  ambDown_rack,
      rackid: ambDown_rackid,
      serverName:ambDown_serverName,
      serverId:ambDown_serverId,
      floor:ambDown_floor
    };

/** 2020.01.21 : ambJump Test Code Add
var ambJump = {
  value: [22,27],
  oldvalue: [23,26],
  jump: [0.714,0.983],
  rack:  ["A-AK-7","B-AN-4"],
  rackid: ["39","293"],
  serverName: ["LTEPCRF#07","PCRF#06S"],
  serverId: ["321","1388"],
  floor: ["5","5"],
  status: ["MINOR","CRITICAL"]
};
*/

    var ambJump = {
      value: ambJump_value,
      oldvalue: ambJump_oldvalue,
      jump: ambJump_jump,
      rack:  ambJump_rack,
      rackid: ambJump_rackid,
      serverName: ambJump_serverName,
      serverId: ambJump_serverId,
      floor: ambJump_floor,
      status: ambJump_status
    };
/** 2019.12.27 revision : Deleted for TT Information about cooling system
    var ambMax = {
      value: ambMax_value,
      rack: ambMax_rem._rack,
      rackid: ambMax_rem._rackid,
      serverName:ambMax_rem._hostname,
      serverId:ambMax_rem._id,
      floor:ambMax_rem._floor,
    };

    var ambRatio = {
      value: ambRatio_value,
      rack: ambRatio_rem._rack,
      rackid: ambRatio_rem._rackid,
      serverName:ambRatio_rem._hostname,
      serverId:ambRatio_rem._id,
      floor:ambRatio_rem._floor,
    };
*/

/**
var coolerInfo = {
  class:["2","2"],
  contents: ["5F냉방기 Down","7FICAC_VH,RMT5 7F 실 내 온 도 5 27.05 Urgent"],
  location: ["SUNGSU","SUNGSU"],
  servertime: ["2019-12-30 00:02:23","2019-01-02 00:02:23"]
};

*/
    // 2019.12.27 Added for TT information about cooling system
    var coolerInfo = {
      class: coolerInfo_class,
      contents: coolerInfo_contents,
      location: coolerInfo_location,
      servertime: coolerInfo_servertime
    };

    // 2019.12.27 revision : Added for TT information about cooling system
    // var tempMax = {
    //   amb_value: ambMax_value,
    //   amb_rack: ambMax_rem._rack,
    //   amb_rackid: ambMax_rem._rackid,
    //   amb_serverName:ambMax_rem._hostname,
    //   amb_serverId:ambMax_rem._id,
    //   amb_floor:ambMax_rem._floor,
    //   cpu_value: cpuMax_value,
    //   cpu_rack: cpuMax_rem._rack,
    //   cpu_rackid: cpuMax_rem._rackid,
    //   cpu_serverName:cpuMax_rem._hostname,
    //   cpu_serverId:cpuMax_rem._id,
    //   cpu_floor:cpuMax_rem._floor,
    // };

    // 2019.12.27 revision : smrCpuMax, smrCpuRatioMax, smrAmbMax, smrAmbRatioMax fields are deprecated to add TT information about cooling system
    var final={
      smrCpuDown:cpuDown,
      smrCpuJump:cpuJump,
      //smrCpuMax:cpuMax,
      //smrCpuRatioMax:cpuRatio,
      smrAmbDown:ambDown,
      smrAmbJump:ambJump,
      //smrAmbMax:ambMax,
      //smrAmbRatioMax:ambRatio,
      smrCoolerInfo:coolerInfo,
      // smrTempMax:tempMax
    };

    var result = {
      result_code: result_code,
      result_msg: result_msg,
      result: final
    };
    res.send(JSON.stringify(result));
  })
});

router.get('/v1/alarms', function(req, res, next) {
    var result;
    var result_code = 1;
    var result_msg = "success";
	async.parallel([
		function(callback){
			  /* API Send body */
			  var alarmsId = [];
			  var alarm_type = [];
			  var eventTime = [];
			  var date = [];
			  var time = [];
			  var serverName = [];
			  var serverLocation = [];
			  var _event = [];
			  var site=[];
			  var alarm_code=[];
			  var alarm_mask=[];
			  /* API Send body */

			  var cnt=0;
			  
			  /** 알람 Clear 메세지 parsing하여 Clear 시켜주는 logic */
			  mysqlDB.query('SELECT date, time, system_name, sys_sub_name, alarm_type, alarm_code, alarm_mask FROM alarm_list',
					  function(error, results, fields) {
			    		if (error) {
			    			console.log(error);
			    		} else {
			    			results.forEach(function(e) {
			    					eventTime.push(e.date+' '+e.time);
			    					date.push(e.date);
				    				time.push(e.time);
				    				serverName.push(e.system_name);
				    				serverLocation.push(e.sys_sub_name);
				    				alarm_type.push(e.alarm_type);
				    				_event.push(e.alarm_desc);
				    				alarm_code.push(e.alarm_code);
									alarm_mask.push(e.alarm_mask);
			    			});
			    			eventTime.forEach(function(e,index){
			    				if(alarm_type[index] == "CLEAR"){
			    					cnt=0;
			    					for(i=0; i<index; i++){
			    		        		if(eventTime[index] >= eventTime[i] && serverLocation[index] == serverLocation[i] && alarm_code[index]== alarm_code[i] && alarm_mask[i]=="n" &&( alarm_type[i] == "ALARM" || alarm_type[i] == "STAT")){
			    		        			if(cnt<1){
			    		        				cnt++;
			    		        				var sql = 'UPDATE alarm_list SET alarm_mask=\'Y\' where sys_sub_name=? and alarm_type=\'ALARM\' and alarm_code=? and alarm_mask = \'N\' and date <= ? and time <= ? ';
			    		        				var params = [serverLocation[i], alarm_code[i], date[i], time[i]];
			    		        				console.log("CLEAR : "+serverLocation[index], alarm_code[index], date[index], time[index]);
			    		        				console.log("ALARM : "+serverLocation[i], alarm_code[i], date[i], time[i]);
			    			        			mysqlDB.query(sql, params,
			    			        					function(error, results, fields) {
			    			        	    		if (error) {
			    			        	    			console.log(error);
			    			        	    		} else {
			    			        	    			//console.log(results);
			    			        	    		}
			    			        			});
			    		        			}
			    		        		}
			    					}
			    				}
			    			});
			    		}
		    			var json = {
		    					
		    			}
		    			callback(null,json);
			  		});	
		  },  
		  function(callback){
			  /* API Send body */
			  var alarmsId = [];
			  var alarm_type = [];
			  var eventTime = [];
			  var date = [];
			  var time = [];
			  var serverName = [];
			  var serverLocation = [];
			  var _event = [];
			  var site=[];
			  var alarm_code=[];
			  
			  var sql = 'SELECT alarm_list.date as date, alarm_list.time as time, system_info_total.location as location, alarm_list.system_name as system_name, alarm_list.sys_sub_name as sys_sub_name, alarm_list.alarm_type as alarm_type, alarm_list.alarm_desc as alarm_desc, alarm_list.alarm_code as alarm_code  FROM alarm_list, system_info_total where alarm_list.system_name = system_info_total.system_name and alarm_list.alarm_mask=\'N\' and alarm_list.alarm_type in(\'ALARM\',\'STAT\')';
			  mysqlDB.query(sql,
  					function(error, results, fields) {
  	    		if (error) {
  	    			console.log(error);
  	    		} else {
  	    			results.forEach(function(e) {
  	    					eventTime.push(e.date+' '+e.time);
  		    				serverName.push(e.system_name);
  		    				serverLocation.push(e.sys_sub_name);
  		    				alarm_type.push(e.alarm_type);
  		    				_event.push(e.alarm_desc);
  		    				site.push(e.location);
  		    				alarm_code.push(e.alarm_code);
  	    			});
  	    		}
  	    		var json = {
  	    				eventTime : eventTime,
  	    				serverName : serverName,
  	    				serverLocation : serverLocation,
  	    				alarm_type : alarm_type,
  	    				event : _event,
  	    				site : site,
  	    				alarm_code : alarm_code
		      	}
	      		callback(null,json);
  			});
		  }
	],
	  function(err,results){
	    if(err)console.log(err);
	    var result = {
	      result_code: result_code,
	      result_msg: result_msg,
	      result:results
	    };
	    res.send(JSON.stringify(result));
	  });
});

//임계치에 해당하는 통계 data를 alarm_list table에 insert하는 logic
router.get('/v1/stats', function(req, res, next) {
    var result;
    var result_code = 1;
    var result_msg = "success";
	async.parallel([
		function(callback){ 
			  var system_name = [];
			  var system_type = [];
			  var date = [];
			  var time = [];
			  var type = [];
			  var succ_rate = [];
			  var att = [];
			  
			  var system = [];
			  var th0 = [];
			  var th1 = [];
			  var th2 = [];
			  var th3 = [];
			  var th4 = [];
			  var th5 = [];
			  var th6 = [];
			  var th7 = [];
			  
			  var D_th0, D_th1, D_th2, D_th3, D_th4, D_th5, D_th6, D_th7;
    		  var H_th0, H_th1, H_th2, H_th3, H_th4, H_th5, H_th6, H_th7;
    		  
    		  var clear_sysname=[], clear_date=[], clear_time=[], clear_systype=[], clear_almcode=[], clear_almtype=[];
    		  
    		   
			
			  mysqlDB.query('select pgw_stat_list.system_name, system_info_pgw.system_type, pgw_stat_list.date, pgw_stat_list.time, pgw_stat_list.type, pgw_stat_list.succ_rate, pgw_stat_list.att from pgw_stat_list, system_info_pgw where pgw_stat_list.system_name = system_info_pgw.system_name and pgw_stat_list.stat_mask=\'N\' limit 200;',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system_name.push(e.system_name);
				      			system_type.push(e.system_type);
				      			date.push(e.date);
				      			time.push(e.time);
				      			type.push(e.type);
				      			succ_rate.push(e.succ_rate);
				      			att.push(e.att);
				      		});
				      		mysqlDB.query('select system, th0, th1, th2, th3, th4, th5, th6, th7 from threshold_list where system like \'%PGW\';',
									  function(error, results, fields) {
									  	if (error) {
								      		console.log(error);
								      	} else {
								      		results.forEach(function(e) {
								      			system.push(e.system);
								      			th0.push(e.th0);
								      			th1.push(e.th1);
								      			th2.push(e.th2);
								      			th3.push(e.th3);
								      			th4.push(e.th4);
								      			th5.push(e.th5);
								      			th6.push(e.th6);
								      			th7.push(e.th7);
								      			
								      		    system.forEach(function(e,index){
								      		    	if(system[index] == "DPGW"){
								      		    		D_th0 = th0[index];
								      		    		D_th1 = th1[index];
								      		    		D_th2 = th2[index];
								      		    		D_th3 = th3[index];
								      		    		D_th4 = th4[index];
								      		    		D_th5 = th5[index];
								      		    		D_th6 = th6[index];
								      		    		D_th7 = th7[index];
								      		    	}
								      		    	else if(system[index] == "HPGW"){
								      		    		H_th0 = th0[index];
								      		    		H_th1 = th1[index];
								      		    		H_th2 = th2[index];
								      		    		H_th3 = th3[index];
								      		    		H_th4 = th4[index];
								      		    		H_th5 = th5[index];
								      		    		H_th6 = th6[index];
								      		    		H_th7 = th7[index];
								      		    	}
								      		    });
								      		});
							      			var sql_insert = 'INSERT INTO alarm_list VALUE (?,?,?,?,?,?,?,\'N\');'
							      			var sql_update = 'UPDATE pgw_stat_list SET stat_mask=\'Y\' WHERE date=? and time=? and system_name=? and type=? and succ_rate=? and att=?'
							      			
							      			
							      			system_name.forEach(function(e,index) {
							      				if(system_type[index] == "D"){
							      					switch(type[index]){
														case "DNS" : 
															if(Number(succ_rate[index]) < Number(D_th0) && Number(att[index]) > Number(D_th4)){
										        				  var params = [date[index], time[index], system_name[index], system_name[index]+"/"+type[index], "STAT", "DNS","Success Rate : "+succ_rate[index]];
								  	       	         			  mysqlDB.query(sql_insert, params,
								  	       	         				 function(error, results, fields) {
												        	    		if (error) {
												        	    			console.log(error);
												        	    		} else {
												        	    			var params = [date[index], time[index], system_name[index], type[index], succ_rate[index], att[index]];
												        	    			mysqlDB.query(sql_update, params,
												        	    					function(error, results, fields){
														        	    				if (error) {
																        	    			console.log(error);
																        	    		} else {
																        	    			console.log("DNS 성공");
																        	    		}
												        	    			});
												        	    		}
											        			     });
															}													
															break;
														case "CSR" : 
															if(Number(succ_rate[index]) < Number(D_th1) && Number(att[index]) > Number(D_th5)){
																var params = [date[index], time[index], system_name[index], system_name[index]+"/"+type[index], "STAT", "CSR","Success Rate : "+succ_rate[index]];
								  	       	         			  mysqlDB.query(sql_insert, params,
								  	       	         				 function(error, results, fields) {
												        	    		if (error) {
												        	    			console.log(error);
												        	    		} else {
												        	    			var params = [date[index], time[index], system_name[index], type[index], succ_rate[index], att[index]];
												        	    			mysqlDB.query(sql_update, params,
												        	    					function(error, results, fields){
														        	    				if (error) {
																        	    			console.log(error);
																        	    		} else {
																        	    			console.log("CSR 성공");
																        	    		}
												        	    			});
												        	    		}
											        			     });
															}
															break;
														case "MBR" : 
															if(Number(succ_rate[index]) < Number(D_th2) && Number(att[index]) > Number(D_th6)){
																var params = [date[index], time[index], system_name[index], system_name[index]+"/"+type[index], "STAT", "MBR","Success Rate : "+succ_rate[index]];
								  	       	         			  mysqlDB.query(sql_insert, params,
								  	       	         				 function(error, results, fields) {
												        	    		if (error) {
												        	    			console.log(error);
												        	    		} else {
												        	    			var params = [date[index], time[index], system_name[index], type[index], succ_rate[index], att[index]];
												        	    			mysqlDB.query(sql_update, params,
												        	    					function(error, results, fields){
														        	    				if (error) {
																        	    			console.log(error);
																        	    		} else {
																        	    			console.log("MBR 성공");
																        	    		}
												        	    			});
												        	    		}
											        			     });
															}
															break;
														case "OCS" : //OCS 
															if(Number(succ_rate[index]) < Number(D_th3) && Number(att[index]) > Number(D_th7)){
																var params = [date[index], time[index], system_name[index], system_name[index]+"/"+type[index], "STAT", "OCS","Success Rate : "+succ_rate[index]];
								  	       	         			  mysqlDB.query(sql_insert, params,
								  	       	         				 function(error, results, fields) {
												        	    		if (error) {
												        	    			console.log(error);
												        	    		} else {
												        	    			var params = [date[index], time[index], system_name[index], type[index], succ_rate[index], att[index]];
												        	    			mysqlDB.query(sql_update, params,
												        	    					function(error, results, fields){
														        	    				if (error) {
																        	    			console.log(error);
																        	    		} else {
																        	    			console.log("OCS 성공");
																        	    		}
												        	    			});
												        	    		}
											        			     });
															}
															break;
													}
												}
												if(system_type[index] == "H"){
													// HDV PGW 로직 설정
													switch(type[index]){
														case "CSR" : 
															if(Number(succ_rate[index]) < Number(D_th1) && Number(att[index]) > Number(D_th5)){
																var params = [date[index], time[index], system_name[index], system_name[index]+"/"+type[index], "STAT", "CSR","Success Rate : "+succ_rate[index]];
								  	       	         			  mysqlDB.query(sql_insert, params,
								  	       	         				 function(error, results, fields) {
												        	    		if (error) {
												        	    			console.log(error);
												        	    		} else {
												        	    			var params = [date[index], time[index], system_name[index], type[index], succ_rate[index], att[index]];
												        	    			mysqlDB.query(sql_update, params,
												        	    					function(error, results, fields){
														        	    				if (error) {
																        	    			console.log(error);
																        	    		} else {
																        	    			console.log("CSR 성공");
																        	    		}
												        	    			});
												        	    		}
											        			     });
															}
															break;
														case "MBR" : 
															if(Number(succ_rate[index]) < Number(D_th2) && Number(att[index]) > Number(D_th6)){
																var params = [date[index], time[index], system_name[index], system_name[index]+"/"+type[index], "STAT", "MBR","Success Rate : "+succ_rate[index]];
								  	       	         			  mysqlDB.query(sql_insert, params,
								  	       	         				 function(error, results, fields) {
												        	    		if (error) {
												        	    			console.log(error);
												        	    		} else {
												        	    			var params = [date[index], time[index], system_name[index], type[index], succ_rate[index], att[index]];
												        	    			mysqlDB.query(sql_update, params,
												        	    					function(error, results, fields){
														        	    				if (error) {
																        	    			console.log(error);
																        	    		} else {
																        	    			console.log("MBR 성공");
																        	    		}
												        	    			});
												        	    		}
											        			     });
															}
															break;
													}
												}
							      			});
								      		//callback(null,json);
							      			/**통계 Clear logic */
							      			var sql_search_stat = 'select alarm_list.date,alarm_list.time,alarm_list.system_name,system_info_pgw.system_type, alarm_code, alarm_type from alarm_list, system_info_pgw where alarm_list.system_name = system_info_pgw.system_name and alarm_mask=\'N\' and alarm_type=\'STAT\';';
							      			var sql_clear = 'UPDATE alarm_list SET alarm_mask=\'Y\' where date=? and time=? and system_name=? and alarm_code=?';
							      					
							      			mysqlDB.query(sql_search_stat,
							      					function(error, results, fields){
							      						if(results != ""){
							      							console.log(results);
							      							results.forEach(function(e) {
							      								clear_sysname.push(e.system_name);
							      								clear_date.push(e.date);
							      								clear_time.push(e.time);
							      								clear_systype.push(e.system_type);
							      								clear_almcode.push(e.alarm_code);
							      								clear_almtype.push(e.alarm_type);
							      							});
							      							
							      							clear_sysname.forEach(function(e,index_c) {
							      								system_name.forEach(function(e,index_s){
							      									if(clear_sysname[index_c] == system_name[index_s] && clear_date[index_c] <= date[index_s] && clear_time[index_c] <= time[index_s]){
							      										if(clear_systype[index_c] =='D'){
													      					switch(clear_almcode[index_c]){
																				case "DNS" : 
																					if(Number(succ_rate[index_s]) > Number(D_th0) && Number(att[index_s]) > Number(D_th4)){
																						  var params = [clear_date[index_c], clear_time[index_c], clear_sysname[index_c], clear_almcode[index_c]];
														  	       	         			  mysqlDB.query(sql_clear, params,
														  	       	         				 function(error, results, fields) {
																		        	    		if (error) {
																		        	    			console.log(error);
																		        	    		} else {
																		        	    			console.log("Clear 성공");
																		        	    		}
																	        			     });
																					}
																					break;
																				case "CSR" : 
																					if(Number(succ_rate[index_s]) > Number(D_th1) && Number(att[index_s]) > Number(D_th5)){
																						var params = [clear_date[index_c], clear_time[index_c], clear_sysname[index_c], clear_almcode[index_c]];
														  	       	         			  mysqlDB.query(sql_clear, params,
														  	       	         				 function(error, results, fields) {
																		        	    		if (error) {
																		        	    			console.log(error);
																		        	    		} else {
																		        	    			console.log("Clear 성공");
																		        	    		}
																	        			     });
																					}
																					break;
																				case "MBR" : 
																					if(Number(succ_rate[index_s]) > Number(D_th2) && Number(att[index_s]) > Number(D_th6)){
																						var params = [clear_date[index_c], clear_time[index_c], clear_sysname[index_c], clear_almcode[index_c]];
														  	       	         			  mysqlDB.query(sql_clear, params,
														  	       	         				 function(error, results, fields) {
																		        	    		if (error) {
																		        	    			console.log(error);
																		        	    		} else {
																		        	    			console.log("Clear 성공");
																		        	    		}
																	        			     });
																					}
																					break;
																				case "OCS" : //OCS 
																					if(Number(succ_rate[index_s]) > Number(D_th3) && Number(att[index_s]) > Number(D_th7)){
																						var params = [clear_date[index_c], clear_time[index_c], clear_sysname[index_c], clear_almcode[index_c]];
														  	       	         			  mysqlDB.query(sql_clear, params,
														  	       	         				 function(error, results, fields) {
																		        	    		if (error) {
																		        	    			console.log(error);
																		        	    		} else {
																		        	    			console.log("Clear 성공");
																		        	    		}
																	        			     });
																					}
																					break;
																			}
							      										}
							      										if(clear_systype[index_c] == "H"){
																			// HDV PGW 로직 설정
							      											switch(clear_almcode[index_c]){
																				case "CSR" : 
																					if(Number(succ_rate[index_s]) > Number(D_th1) && Number(att[index_s]) > Number(D_th5)){
																						var params = [clear_date[index_c], clear_time[index_c], clear_sysname[index_c], clear_almcode[index_c]];
														  	       	         			  mysqlDB.query(sql_clear, params,
														  	       	         				 function(error, results, fields) {
																		        	    		if (error) {
																		        	    			console.log(error);
																		        	    		} else {
																		        	    			console.log("Clear 성공");
																		        	    		}
																	        			     });
																					}
																					break;
																				case "MBR" : 
																					if(Number(succ_rate[index_s]) > Number(D_th2) && Number(att[index_s]) > Number(D_th6)){
																						var params = [clear_date[index_c], clear_time[index_c], clear_sysname[index_c], clear_almcode[index_c]];
														  	       	         			  mysqlDB.query(sql_clear, params,
														  	       	         				 function(error, results, fields) {
																		        	    		if (error) {
																		        	    			console.log(error);
																		        	    		} else {
																		        	    			console.log("Clear 성공");
																		        	    		}
																	        			     });
																					}
																					break;
																			}
																		}
																	}
																	
							      								})
											      				
											      			});
							      					}else{
							      						//alarm_list 테이블에 값 없을 시(통계로인한 장애 상황이 아닐 시)
							      					}
							      			})
								      	}
									  	
							});
				      	}
					  	callback(null,system_name);
				  });

		}
	],
    function(err,results){
	    if(err)console.log(err);
	    var result = {
	      result_code: result_code,
	      result_msg: result_msg,
	      result:results
    };
    res.send(JSON.stringify(result));
  });
});


router.get('/v1/5Gsystem', function(req, res, next) {
    var result;
    var result_code = 1;
    var result_msg = "success";
    
    async.parallel([
		function(callback){ /** MAP.js PGW 전체 식수,Sess수 출력 */
			/* API Send body */
			  var curPGWCnt = [];
			  var totPGWCnt = [];
			  var curPGWSess = [];
			  var totPGWSess = [];
			  var result_code = 1;
			  var result_msg = "success";

			  var cnt=0;
			  
			  mysqlDB.query('select count(*) as cnt, (select sum(max_session) from system_info_pgw) as totSess, (select sum(current_session)  from system_info_pgw where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curSess, (select count(*) from system_info_pgw  where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curCnt from system_info_pgw',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			var totSess = e.totSess/10000;
				      			var curSess = e.curSess/10000;
				      			curPGWCnt.push(e.curCnt);
				      			totPGWCnt.push(e.cnt);
				      			curPGWSess.push(Math.round(curSess));
				      			totPGWSess.push(totSess);
				      		});
				      		var final = {
				      			curPGWCnt : curPGWCnt,	
				      			totPGWCnt: totPGWCnt,
				      			curPGWSess : curPGWSess,
				      			totPGWSess: totPGWSess
				      		}
				      		json = {
								    result_code: result_code,
								    result_msg: result_msg,
								    result: final
							};
				      	}
					  	callback(null,final);
				  });
		  },
		  function(callback){ /** MAP.js TAS 전체 식수, 가입자수 출력 */
				/* API Send body */
				  var curTASCnt = [];
				  var totTASCnt = [];
				  var curTASSub = [];
				  var totTASSub = [];
				  var result_code = 1;
				  var result_msg = "success";

				  var cnt=0;
				  
				  mysqlDB.query('select count(*) as cnt, (select sum(max_sub) from system_info_tas) as totSub, (select sum(current_sub)  from system_info_tas where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curSub, (select count(*) from system_info_tas  where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curCnt from system_info_tas',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			var totSub = e.totSub/10000;
					      			var curSub = e.curSub/10000;
					      			curTASCnt.push(e.curCnt);
					      			totTASCnt.push(e.cnt);
					      			curTASSub.push(Math.round(curSub));
					      			totTASSub.push(totSub);
					      		});
					      		var final = {
					      			curTASCnt : curTASCnt,	
					      			totTASCnt: totTASCnt,
					      			curTASSub : curTASSub,
					      			totTASSub: totTASSub
					      		}
					      		json = {
									    result_code: result_code,
									    result_msg: result_msg,
									    result: final
								};
					      	}
						  	callback(null,final);
					  });
		  },
		//fallback(2), HSS 정보 전송
		  function(callback){
			  var curHSSCnt = [];
			  var totHSSCnt = [];
			  var curHSSTps = [];
			  var totHSSTps = [];
				
			  mysqlDB.query('select count(*) as cnt, (select sum(max_tps) from system_info_hss) as totTps, (select sum(current_tps) from system_info_hss where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curTps, (select count(*) from system_info_hss  where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curCnt from system_info_hss',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			curHSSCnt.push(e.curCnt);
			      			totHSSCnt.push(e.cnt);
			      			curHSSTps.push(Math.round(e.curTps));
			      			totHSSTps.push(e.totTps);
			      		});
			      		var json = {
			      				curHSSCnt : curHSSCnt,	
			      				totHSSCnt: totHSSCnt,
			      				curHSSTps : curHSSTps,
			      				totHSSTps: totHSSTps
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		//fallback(3), HLR 정보 전송
		  function(callback){
			  var curHLRCnt = [];
			  var totHLRCnt = [];
			  var curHLRTps = [];
			  var totHLRTps = [];
				
			  mysqlDB.query('select count(*) as cnt, (select sum(max_tps) from system_info_hlr) as totTps, (select sum(current_tps) from system_info_hlr where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curTps, (select count(*) from system_info_hlr  where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curCnt from system_info_hlr',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			curHLRCnt.push(e.curCnt);
			      			totHLRCnt.push(e.cnt);
			      			curHLRTps.push(Math.round(e.curTps));
			      			totHLRTps.push(e.totTps);
			      		});
			      		var json = {
			      				curHLRCnt : curHLRCnt,	
			      				totHLRCnt: totHLRCnt,
			      				curHLRTps : curHLRTps,
			      				totHLRTps: totHLRTps
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		//fallback(4), AuC 정보 전송
		  function(callback){
			  var curAuCCnt = [];
			  var totAuCCnt = [];
			  var curAuCTps = [];
			  var totAuCTps = [];
				
			  mysqlDB.query('select count(*) as cnt, (select sum(max_tps) from system_info_auc) as totTps, (select sum(current_tps) from system_info_auc where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curTps, (select count(*) from system_info_auc  where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curCnt from system_info_auc',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			curAuCCnt.push(e.curCnt);
			      			totAuCCnt.push(e.cnt);
			      			curAuCTps.push(Math.round(e.curTps));
			      			totAuCTps.push(e.totTps);
			      		});
			      		var json = {
			      				curAuCCnt : curAuCCnt,	
			      				totAuCCnt: totAuCCnt,
			      				curAuCTps : curAuCTps,
			      				totAuCTps: totAuCTps
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		//fallback(5), UCMS 정보 전송
		  function(callback){
			  var curUCMSCnt = [];
			  var totUCMSCnt = [];
			  var curUCMSTps = [];
			  var totUCMSTps = [];
				
			  mysqlDB.query('select count(*) as cnt, (select sum(max_tps) from system_info_ucms) as totTps, (select sum(current_tps) from system_info_ucms where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curTps, (select count(*) from system_info_ucms  where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\')) as curCnt from system_info_ucms',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			curUCMSCnt.push(e.curCnt);
			      			totUCMSCnt.push(e.cnt);
			      			curUCMSTps.push(Math.round(e.curTps));
			      			totUCMSTps.push(e.totTps);
			      		});
			      		var json = {
			      				curUCMSCnt : curUCMSCnt,	
			      				totUCMSCnt: totUCMSCnt,
			      				curUCMSTps : curUCMSTps,
			      				totUCMSTps: totUCMSTps
			      		}
			      		callback(null,json);
			      	}
			  });
		  }
		 ],
	  function(err,results){
	    if(err)console.log(err);
	    var result = {
	      result_code: result_code,
	      result_msg: result_msg,
	      result:results
	    };
	    res.send(JSON.stringify(result));
	});
});


router.get('/v1/pgw-list', function(req, res, next) {
  /* API Send body */
	  var result_code = 1;
	  var result_msg = "success";
	  
	  async.parallel([
		  function(callback){
			  var system_name = [];
			  var system_type = [];
			  var curSess = [];
			  var totSess = [];
			  mysqlDB.query('select system_name, system_type, current_session, max_session from system_info_pgw;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			system_type.push(e.system_type);
			      			curSess.push((e.current_session/10000).toFixed(2));
			      			totSess.push(e.max_session/10000);
			      		});
			      		var json = {
			      			system_name : system_name,
			      			system_type : system_type,
			      			curSess : curSess,
			      			totSess : totSess
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		  // DATA PGW 요약 정보 전송
		  function(callback){
			  var curDataCnt = [];
			  var totDataCnt = [];
			  var curDataSess = [];
			  var totDataSess = [];
			  var curDataBps =[];
			  var totDataBps =[];
			  
			  mysqlDB.query('select (select count(system_name) from system_info_pgw where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask=\'N\') and system_type=' + '"D"'+ ') as curDCnt, ' +
					  		'count(system_name) as totDCnt, '+
					        'sum(current_session) as curDSess, ' +
					        '(select sum(max_session) from system_info_pgw where system_type=' + '"D"'+ ') as totDSess, ' +
					        'sum(current_bps) as curDBps, sum(max_bps) as totDBps ' +
					        'from system_info_pgw where system_type=' + '"D"',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			curDataCnt.push(e.curDCnt);
				      			totDataCnt.push(e.totDCnt);
				      			curDataSess.push(e.curDSess);
				      			totDataSess.push(e.totDSess);
				      			curDataBps.push((e.curDBps/1048576).toFixed(2));
				      			totDataBps.push(e.totDBps/1048576);
				      		});
				      		var json = {
				      			curDataCnt : curDataCnt,
				      			totDataCnt : totDataCnt,
				      			curDataSess : curDataSess,
				      			totDataSess : totDataSess,
				      			curDataBps : curDataBps,
				      			totDataBps : totDataBps
				      		};
				      		callback(null,json);
				      	};
				  });
		  },
		  // 장애 SYSTEM Animation 표시
		  function(callback){
			  var system_name = [];

			  mysqlDB.query('select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\' and system_name LIKE ' + '"%PGW%"',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      		});
			      		var json = {
			      			system_name : system_name,
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		  // HDV PGW 요약 정보 전송
		  function(callback){
			  var curHDVCnt = [];
			  var totHDVCnt = [];
			  var curHDVSess = [];
			  var totHDVSess = [];
			  var curHDVBps =[];
			  var totHDVBps =[];
			  
			  mysqlDB.query('select (select count(system_name) from system_info_pgw where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and system_type=' + '"H"'+ ') as curHDVCnt, ' +
					  		'count(system_name) as totHDVCnt, '+
					        'sum(current_session) as curHDVSess, ' +
					        '(select sum(max_session) from system_info_pgw where system_type=' + '"H"'+ ') as totHDVSess, ' +
					        'sum(current_bps) as curHDVBps, sum(max_bps) as totHDVBps ' +
					        'from system_info_pgw where system_type=' + '"H"',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			curHDVCnt.push(e.curHDVCnt);
				      			totHDVCnt.push(e.totHDVCnt);
				      			curHDVSess.push(e.curHDVSess);
				      			totHDVSess.push(e.totHDVSess);
				      			curHDVBps.push((e.curHDVBps/1073741824).toFixed(2));
				      			totHDVBps.push((e.totHDVBps/1073741824).toFixed(0));
				      		});
				      		var json = {
				      			curHDVCnt : curHDVCnt,
				      			totHDVCnt : totHDVCnt,
				      			curHDVSess : curHDVSess,
				      			totHDVSess : totHDVSess,
				      			curHDVBps : curHDVBps,
				      			totHDVBps : totHDVBps
				      		};
				      		callback(null,json);
				      		
				      	};
				  });
		  }
	  ],
	  function(err,results){
	    if(err)console.log(err);
	    var result = {
	      result_code: result_code,
	      result_msg: result_msg,
	      result:results
	    };
	    res.send(JSON.stringify(result));
	  });
});

router.get('/v1/pgw-list/:number', function(req, res, next) {
	  /* API Send body */
	  var result_code = 1;
	  var result_msg = "success";

	  
	  async.parallel([ //상면,세션,bps DATA Query, pgw-detail.js, fallback(0)
		  function(callback){
			  var system_name = [];
			  var building = [];
			  var floor_plan = [];
			  var curSess = [];
			  var totSess = [];
			  var curBps = [];
			  var totBps = [];
			  mysqlDB.query('select system_name, building, floor_plan, current_session, max_session, current_bps, max_bps from system_info_pgw;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			building.push(e.building);
			      			floor_plan.push(e.floor_plan);
			      			curSess.push((e.current_session/10000).toFixed(1));
			      			totSess.push((e.max_session/10000).toFixed(0));
			      			curBps.push((e.current_bps/1048576).toFixed(2));
			      			totBps.push((e.max_bps/1048576).toFixed(2));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			building : building,
			      			floor_plan : floor_plan,
			      			curSess : curSess,
			      			totSess : totSess,
			      			curBps : curBps,
			      			totBps : totBps
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		  function(callback){ //통계 DATA Query, pgw-detail.js, fallback(1)
			  var system_name = [];
			  var system_type = [];
			  var date = [];
			  var time = [];
			  var type = [];
			  var succ_rate = [];
			  var att = [];
			  mysqlDB.query('select pgw_stat_list.system_name, system_info_pgw.system_type, pgw_stat_list.date, pgw_stat_list.time, pgw_stat_list.type, pgw_stat_list.succ_rate, pgw_stat_list.att from pgw_stat_list, system_info_pgw where pgw_stat_list.system_name = system_info_pgw.system_name;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			system_type.push(e.system_type);
			      			date.push(e.date);
			      			time.push(e.time);
			      			type.push(e.type);
			      			succ_rate.push(Number(e.succ_rate));
			      			att.push(Number(e.att));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			system_type : system_type,
			      			date : date,
			      			time : time,
			      			type : type,
			      			succ_rate : succ_rate,
			      			att : att
			      		}
			      		callback(null,json);
			      	}
			  });

		  },
		  function(callback){ //알람 DATA Query, pgw-detail.js, fallback(2)
			  var system_name = [];
			  var date = [];
			  var time = [];
			  var sys_sub_name = [];
			  var type = [];
			  var code = [];
			  
			  mysqlDB.query('select date, time, system_name, sys_sub_name, alarm_type, alarm_code from alarm_list where alarm_type =\'ALARM\' and alarm_mask =\'N\' and system_name like \'%PGW%\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			date.push(e.date);
				      			time.push(e.time);
				      			system_name.push(e.system_name);
				      			sys_sub_name.push(e.sys_sub_name);
				      			type.push(e.alarm_type);
				      			code.push(e.alarm_code);
				      		});
				      		var json = {
				      			date : date,
				      			time : time,
				      			system_name : system_name,
				      			sys_sub_name : sys_sub_name,
				      			type : type,
				      			code : code
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
		  function(callback){ //Threshold Query, pgw-detail.js, fallback(3)
			  var system = [];
			  var th0 = [];
			  var th1 = [];
			  var th2 = [];
			  var th3 = [];
			  var th4 = [];
			  var th5 = [];
			  var th6 = [];
			  var th7 = [];
			  
			  mysqlDB.query('select system, th0, th1, th2, th3, th4, th5, th6, th7 from threshold_list where system like \'%PGW\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system.push(e.system);
				      			th0.push(e.th0);
				      			th1.push(e.th1);
				      			th2.push(e.th2);
				      			th3.push(e.th3);
				      			th4.push(e.th4);
				      			th5.push(e.th5);
				      			th6.push(e.th6);
				      			th7.push(e.th7);
				      		});
				      		var json = {
				      			system : system,
				      			th0 : th0,
				      			th1 : th1,
				      			th2 : th2,
				      			th3 : th3,
				      			th4 : th4,
				      			th5 : th5,
				      			th6 : th6,
				      			th7 : th7
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
	  ],
	  function(err,results){
	    if(err)console.log(err);
	    var result = {
	      result_code: result_code,
	      result_msg: result_msg,
	      result:results
	    };
	    res.send(JSON.stringify(result));
	  });	
});
router.get('/v1/tas-list', function(req, res, next) {
	  /* API Send body */
		  var result_code = 1;
		  var result_msg = "success";
		  
		  async.parallel([
			  /** TAS-LIST 페이지 Zone 별 정보 Query*/
			  function(callback){
				  var system_name = [];
				  var system_type = [];
				  var zone = [];
				  var curSub = [];
				  var totSub = [];
				  mysqlDB.query('select system_name, system_type, zone, current_sub, max_sub from system_info_tas;',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system_name.push(e.system_name);
				      			system_type.push(e.system_type);
				      			zone.push(e.zone);
				      			curSub.push(Number(e.current_sub/10000).toFixed(1));
				      			totSub.push(Number(e.max_sub/10000));
				      		});
				      		var json = {
				      			system_name : system_name,
				      			system_type : system_type,
				      			zone : zone,
				      			curSub : curSub,
				      			totSub : totSub
				      		}
				      		callback(null,json);
				      	}
				  });
			  },
			  //Azone 장비 현황
			  function(callback){
				  var curACnt = [];
				  var totACnt = [];
				  var curASub = [];
				  var totASub = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_tas where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and zone=' + '"A"'+ ') as curACnt, ' +
						  		'count(system_name) as totACnt, '+
						        'sum(current_sub) as curASub, ' +
						        '(select sum(max_sub) from system_info_tas where zone=' + '"A"'+ ') as totASub ' +
						        'from system_info_tas where zone=' + '"A"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curACnt.push(e.curACnt);
					      			totACnt.push(e.totACnt);
					      			curASub.push(e.curASub);
					      			totASub.push(e.totASub);
					      		});
					      		var json = {
					      			curACnt : curACnt,
					      			totACnt : totACnt,
					      			curASub : curASub,
					      			totASub : totASub
					      		};
					      		callback(null,json);
					      	};
					  });
			  },
			//Bzone 장비 현황
			  function(callback){
				  var curBCnt = [];
				  var totBCnt = [];
				  var curBSub = [];
				  var totBSub = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_tas where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and zone=' + '"B"'+ ') as curBCnt, ' +
						  		'count(system_name) as totBCnt, '+
						        'sum(current_sub) as curBSub, ' +
						        '(select sum(max_sub) from system_info_tas where zone=' + '"B"'+ ') as totBSub ' +
						        'from system_info_tas where zone=' + '"B"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curBCnt.push(e.curBCnt);
					      			totBCnt.push(e.totBCnt);
					      			curBSub.push(e.curBSub);
					      			totBSub.push(e.totBSub);
					      		});
					      		var json = {
					      			curBCnt : curBCnt,
					      			totBCnt : totBCnt,
					      			curBSub : curBSub,
					      			totBSub : totBSub
					      		};
					      		callback(null,json);
					      	};
					  });
			  },
			//BKzone 장비 현황
			  function(callback){
				  var curBKCnt = [];
				  var totBKCnt = [];
				  var curBKSub = [];
				  var totBKSub = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_tas where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and zone=' + '"BK"'+ ') as curBKCnt, ' +
						  		'count(system_name) as totBKCnt, '+
						        'sum(current_sub) as curBKSub, ' +
						        '(select sum(max_sub) from system_info_tas where zone=' + '"BK"'+ ') as totBKSub ' +
						        'from system_info_tas where zone=' + '"BK"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curBKCnt.push(e.curBKCnt);
					      			totBKCnt.push(e.totBKCnt);
					      			curBKSub.push(e.curBKSub);
					      			totBKSub.push(e.totBKSub);
					      		});
					      		var json = {
					      			curBKCnt : curBKCnt,
					      			totBKCnt : totBKCnt,
					      			curBKSub : curBKSub,
					      			totBKSub : totBKSub
					      		};
					      		console.log(curBKCnt)
					      		callback(null,json);
					      	};
					  });
			  },
			  // 장애 SYSTEM Animation 표시
			  function(callback){
				  var system_name = [];

				  mysqlDB.query('select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\' and system_name LIKE ' + '"%TAS%"',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system_name.push(e.system_name);
				      		});
				      		var json = {
				      			system_name : system_name,
				      		}
				      		callback(null,json);
				      	}
				  });
			  },
		  ],
		  function(err,results){
		    if(err)console.log(err);
		    var result = {
		      result_code: result_code,
		      result_msg: result_msg,
		      result:results
		    };
		    res.send(JSON.stringify(result));
		  });
});
router.get('/v1/tas-list/:number', function(req, res, next) {
	  /* API Send body */
	  var result_code = 1;
	  var result_msg = "success";

	  
	  async.parallel([ //상면, 가입자수 DATA Query, tas-detail.js, fallback(0)
		  function(callback){
			  var system_name = [];
			  var zone = [];
			  var building = [];
			  var floor_plan = [];
			  var curSub = [];
			  var totSub = [];
			  mysqlDB.query('select system_name, zone, building, floor_plan, current_sub, max_sub from system_info_tas;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			zone.push(e.zone);
			      			building.push(e.building);
			      			floor_plan.push(e.floor_plan);
			      			curSub.push((e.current_sub/10000).toFixed(1));
			      			totSub.push((e.max_sub/10000).toFixed(0));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			zone : zone,
			      			building : building,
			      			floor_plan : floor_plan,
			      			curSub : curSub,
			      			totSub : totSub
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		  function(callback){ //통계 DATA Query, tas-detail.js, fallback(1)
			  var system_name = [];
			  var zone = [];
			  var date = [];
			  var time = [];
			  var type = [];
			  var succ_rate = [];
			  var att = [];
			  mysqlDB.query('select tas_stat_list.system_name, system_info_tas.zone, tas_stat_list.date, tas_stat_list.time, tas_stat_list.type, tas_stat_list.succ_rate, tas_stat_list.att from tas_stat_list, system_info_tas where tas_stat_list.system_name = system_info_tas.system_name;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			zone.push(e.zone);
			      			date.push(e.date);
			      			time.push(e.time);
			      			type.push(e.type);
			      			succ_rate.push(Number(e.succ_rate));
			      			att.push(Number(e.att));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			zone : zone,
			      			date : date,
			      			time : time,
			      			type : type,
			      			succ_rate : succ_rate,
			      			att : att
			      		}
			      		callback(null,json);
			      	}
			  });

		  },
		  function(callback){ //알람 DATA Query, pgw-detail.js, fallback(2)
			  var system_name = [];
			  var date = [];
			  var time = [];
			  var sys_sub_name = [];
			  var type = [];
			  var code = [];
			  
			  mysqlDB.query('select date, time, system_name, sys_sub_name, alarm_type, alarm_code from alarm_list where alarm_type=\'ALARM\' and alarm_mask=\'N\' and system_name like \'%TAS%\'; ',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			date.push(e.date);
				      			time.push(e.time);
				      			system_name.push(e.system_name);
				      			sys_sub_name.push(e.sys_sub_name);
				      			type.push(e.alarm_type);
				      			code.push(e.alarm_code);
				      		});
				      		var json = {
				      			date : date,
				      			time : time,
				      			system_name : system_name,
				      			sys_sub_name : sys_sub_name,
				      			type : type,
				      			code : code
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
		  function(callback){ //Threshold Query, pgw-detail.js, fallback(3)
			  var system = [];
			  var th0 = [];
			  var th1 = [];
			  var th2 = [];
			  var th3 = [];
			  var th4 = [];
			  var th5 = [];
			  var th6 = [];
			  var th7 = [];
			  
			  mysqlDB.query('select system, th0, th1, th2, th3, th4, th5, th6, th7 from threshold_list where system like \'%TAS\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system.push(e.system);
				      			th0.push(e.th0);
				      			th1.push(e.th1);
				      			th2.push(e.th2);
				      			th3.push(e.th3);
				      			th4.push(e.th4);
				      			th5.push(e.th5);
				      			th6.push(e.th6);
				      			th7.push(e.th7);
				      		});
				      		var json = {
				      			system : system,
				      			th0 : th0,
				      			th1 : th1,
				      			th2 : th2,
				      			th3 : th3,
				      			th4 : th4,
				      			th5 : th5,
				      			th6 : th6,
				      			th7 : th7
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
	  ],
	  function(err,results){
	    if(err)console.log(err);
	    var result = {
	      result_code: result_code,
	      result_msg: result_msg,
	      result:results
	    };
	    res.send(JSON.stringify(result));
	  });	
});
router.get('/v1/backgrounds/:site', function(req, res, next) {
  var result_code = 1;
  var result_msg = "success";
  var number = (req.query.number==undefined)?'1':getQueryInUppercase(req.query.number);
  async.parallel([
    function(callback){
      var coordinates = [];
      var type = [];
      var value = [];
      mysqlDB.query('SELECT TYPE,VALUE,X,Y FROM BACKGROUND_INFO WHERE SITE=' + getQueryInUppercase(req.params.site) +
        ' AND FLOOR=' + getQueryInUppercase(req.query.floor),
        function(error, results, fields) {
          if (error) {
            console.log(error);
          } else {
            results.forEach(function(e) {
              coordinates.push("x" + parseInt(e.X) + "y" + parseInt(e.Y));
              type.push(e.TYPE);
              value.push(e.VALUE);
            });
            var json = {
              coordinates: coordinates,
              type: type,
              value: value
            };
            callback(null,json);
          }
        });
    },
    function(callback){
      var rack_id = [];
      var coordinates = [];
      var rackServer = [];
      var image = [];
      var rackImageMapping={};
      var check_coordi= {};
      var check_server= {};
      var doubleArrayCoordi=new Array();
      var doubleArrayServer=new Array();
      var index_coordi = 0;
      var index_server = 0;

      mysqlDB.query('SELECT DISTINCT DEVICE_INFO.ETC,HOST_NAME,DEVICE_INFO.RACK_ID,X_COORDI,Y_COORDI FROM DRAW_INFO inner join DEVICE_INFO on '+
      'DEVICE_INFO.RACK_ID=DRAW_INFO.RACK_ID where DEVICE_INFO.SITE='+getQueryInUppercase(req.params.site)+' and DEVICE_INFO.FLOOR='+getQueryInUppercase(req.query.floor),
        function(error, results, fields) {
          if (error) {
            console.log(error);
          } else {
            results.forEach(function(e) {//S 서버 S아니면 스위치 CR 방화벽 SW 스위치 RT 라우터 ST 스토리지
              var rackid=e.RACK_ID;
              var input_coordi="x" + parseInt(e.X_COORDI) + "y" + parseInt(e.Y_COORDI);
              var input_server=e.HOST_NAME;
              index_coordi=Rackid_Mapping(rackid,doubleArrayCoordi,check_coordi,index_coordi,input_coordi);
              index_server=Rackid_Mapping(rackid,doubleArrayServer,check_server,index_server,input_server);
              if(rackid in rackImageMapping){
                if(e.ETC=='SW'||e.ETC=='RT'||e.ETC=='CR'||e.ETC=='ST')rackImageMapping[rackid]='SWITCH&ROUTER'
              }
              else rackImageMapping[rackid]=e.ETC;
            });
            for(var i=0; i<Object.keys(check_coordi).length; i++){
              var rackid=Object.keys(check_coordi)[i];
              rack_id.push(rackid);
              coordinates.push(doubleArrayCoordi[check_coordi[rackid]].toArray());
              rackServer.push(doubleArrayServer[check_server[rackid]].toArray());
              image.push(rackImageMapping[rackid]=='SWITCH&ROUTER'?'SWITCH&ROUTER':'SERVER');
            }
            var json = {
              rackid: rack_id,
              coordinates: coordinates,
              rackServer: rackServer,
              image:image
            };
            callback(null,json);
          }
        });
    }
  ],
  function(err,results){
    if(err)console.log(err);
    var json = {
      result_code: result_code,
      result_msg: result_msg,
      result: results
    };
    res.send(JSON.stringify(json))
    }
  );
});

router.get('/v1/map', function(req, res, next) {
  /* API Send body */
  /* API Send body */
  var site = [];
  var system_name = [];
  var result;
  var result_code = 1;
  var result_msg = "success";

  async.parallel([
	  function(callback){
		  mysqlDB.query('SELECT alarm_list.date, alarm_list.time, system_info_pgw.location as location, alarm_list.system_name as system_name, alarm_list.sys_sub_name FROM alarm_list, system_info_pgw where alarm_list.system_name = system_info_pgw.system_name',
			function(error, results, fields) {
			  if(error){
				  console.log(error);
			  } else{
				  results.forEach(function(e) {
					  site.push(e.location);
					  system_name.push(e.system_name);
				  });
				  var json = {
				      site : site,
				      system_name : system_name
				  };		
				  callback(null,json);
			  }
		  });
	  }
  ],
  function(err,results){
    if(err)console.log(err);
    var result = {
      result_code: result_code,
      result_msg: result_msg,
      result:results
    };
    res.send(JSON.stringify(result));
  });		  
});

router.get('/v1/TT', function(req, res, next) {
  /* API Send body */s
  var location_arr=[]; var servertime_arr=[]; var contents_arr=[];
  /* API Send body */
  var result;
  var result_code = 1;
  var result_msg = "success";

  influxDB.query('select _contents,_location,_servertime from COOLER where time>now()-1d group by(_id)').then(results => {
    results.groups().forEach(results => {
        var curr = results.rows[0];
        location_arr.push(curr._location);
        servertime_arr.push(curr._servertime);
        contents_arr.push(curr._contents);
    });
    var final = {
      location:location_arr,
      servertime:servertime_arr,
      contents:contents_arr
    }
    result = {
      result_code: result_code,
      result_msg: result_msg,
      result: final
    };
    res.send(JSON.stringify(result));
  })
});

/* -----------------------------------sj 2020.05.18 start----------------------------------- */
router.get('/v1/hss-list', function(req, res, next) {
	  /* API Send body */
		  var result_code = 1;
		  var result_msg = "success";
		  
		  async.parallel([
			  function(callback){
				  var system_name = [];
				  var system_type = [];
				  var curTps = [];
				  var totTps = [];
				  mysqlDB.query('select system_name, system_type, current_tps, max_tps from system_info_hss;',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system_name.push(e.system_name);
				      			system_type.push(e.system_type);
				      			curTps.push(Math.round(e.current_tps));
				      			totTps.push(Math.round(e.max_tps));
				      		});
				      		var json = {
				      			system_name : system_name,
				      			system_type : system_type,
				      			curTps : curTps,
				      			totTps : totTps
				      		}
				      		callback(null,json);
				      	}
				  });
			  },
			  // Active HSS 요약 정보 전송
			  function(callback){
				  var curActiveCnt = [];
				  var totActiveCnt = [];
				  var curActiveTps = [];
				  var totActiveTps = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_hss where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and system_type=' + '"A"'+ ') as curACnt, ' +
						  		'count(system_name) as totACnt, '+
						        'sum(current_tps) as curATps, ' +
						        '(select sum(max_tps) from system_info_hss where system_type=' + '"A"'+ ') as totATps ' +
						        'from system_info_hss where system_type=' + '"A"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curActiveCnt.push(e.curACnt);
					      			totActiveCnt.push(e.totACnt);
					      			curActiveTps.push(e.curATps);
					      			totActiveTps.push(e.totATps);
					      		});
					      		var json = {
					      			curActiveCnt : curActiveCnt,
					      			totActiveCnt : totActiveCnt,
					      			curActiveTps : curActiveTps,
					      			totActiveTps : totActiveTps
					      		};
					      		callback(null,json);
					      	};
					  });
			  },
			  
			  // 장애 SYSTEM Animation 표시
			  function(callback){
				  var system_name = [];

				  mysqlDB.query('select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\' and system_name LIKE ' + '"%HSS%"',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system_name.push(e.system_name);
				      		});
				      		var json = {
				      			system_name : system_name,
				      		}
				      		callback(null,json);
				      	}
				  });
			  },
			  
			// Standby HSS 요약 정보 전송
			  function(callback){
				  var curStandbyCnt = [];
				  var totStandbyCnt = [];
				  var curStandbyTps = [];
				  var totStandbyTps = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_hss where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and system_type=' + '"S"'+ ') as curSCnt, ' +
						  		'count(system_name) as totSCnt, '+
						        'sum(current_tps) as curSTps, ' +
						        '(select sum(max_tps) from system_info_hss where system_type=' + '"S"'+ ') as totSTps ' +
						        'from system_info_hss where system_type=' + '"S"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curStandbyCnt.push(e.curSCnt);
					      			totStandbyCnt.push(e.totSCnt);
					      			curStandbyTps.push(e.curSTps);
					      			totStandbyTps.push(e.totSTps);
					      		});
					      		var json = {
					      			curStandbyCnt : curStandbyCnt,
					      			totStandbyCnt : totStandbyCnt,
					      			curStandbyTps : curStandbyTps,
					      			totStandbyTps : totStandbyTps
					      		};
					      		callback(null,json);
					      	};
					  });
			  },
			  
			// BKUP HSS 요약 정보 전송
			  function(callback){
				  var curBKCnt = [];
				  var totBKCnt = [];
				  var curBKTps = [];
				  var totBKTps = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_hss where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and system_type=' + '"BK"'+ ') as curBCnt, ' +
						  		'count(system_name) as totBCnt, '+
						        'sum(current_tps) as curBTps, ' +
						        '(select sum(max_tps) from system_info_hss where system_type=' + '"BK"'+ ') as totBTps ' +
						        'from system_info_hss where system_type=' + '"BK"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curBKCnt.push(e.curBCnt);
					      			totBKCnt.push(e.totBCnt);
					      			curBKTps.push(e.curBTps);
					      			totBKTps.push(e.totBTps);
					      		});
					      		var json = {
					      			curBKCnt : curBKCnt,
					      			totBKCnt : totBKCnt,
					      			curBKTps : curBKTps,
					      			totBKTps : totBKTps
					      		};
					      		callback(null,json);
					      	};
					  });
			  }
		
		  ],
		  function(err,results){
		    if(err)console.log(err);
		    var result = {
		      result_code: result_code,
		      result_msg: result_msg,
		      result:results
		    };
		    res.send(JSON.stringify(result));
		  });
});

router.get('/v1/hss-list/:number', function(req, res, next) {
	  /* API Send body */
	  var result_code = 1;
	  var result_msg = "success";
	  
	  async.parallel([ //상면,세션,tps DATA Query, hss-detail.js
		  function(callback){
			  var system_name = [];
			  var building = [];
			  var floor_plan = [];
			  var curTps = [];
			  var totTps = [];
			  mysqlDB.query('select system_name, building, floor_plan, current_tps, max_tps from system_info_hss;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			building.push(e.building);
			      			floor_plan.push(e.floor_plan);
			      			curTps.push((e.current_tps));
			      			totTps.push((e.max_tps));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			building : building,
			      			floor_plan : floor_plan,
			      			curTps : curTps,
			      			totTps : totTps
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		  function(callback){ //통계 DATA Query, hss-detail.js
			  var system_name = [];
			  var system_type = [];
			  var date = [];
			  var time = [];
			  var type = [];
			  var succ_rate = [];
			  var att = [];
			  mysqlDB.query('select hss_stat_list.system_name, system_info_hss.system_type, hss_stat_list.date, hss_stat_list.time, hss_stat_list.type, hss_stat_list.succ_rate, hss_stat_list.att from hss_stat_list, system_info_hss where hss_stat_list.system_name = system_info_hss.system_name;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			system_type.push(e.system_type);
			      			date.push(e.date);
			      			time.push(e.time);
			      			type.push(e.type);
			      			succ_rate.push(Number(e.succ_rate));
			      			att.push(Number(e.att));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			system_type : system_type,
			      			date : date,
			      			time : time,
			      			type : type,
			      			succ_rate : succ_rate,
			      			att : att
			      		}
			      		callback(null,json);
			      	}
			  });

		  },
		  function(callback){ //알람 DATA Query, hss-detail.js
			  var system_name = [];
			  var date = [];
			  var time = [];
			  var sys_sub_name = [];
			  var type = [];
			  var code = [];
			  
			  mysqlDB.query('select date, time, system_name, sys_sub_name, alarm_type, alarm_code from alarm_list where alarm_type=\'ALARM\' and alarm_mask=\'N\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			date.push(e.date);
				      			time.push(e.time);
				      			system_name.push(e.system_name);
				      			sys_sub_name.push(e.sys_sub_name);
				      			type.push(e.alarm_type);
				      			code.push(e.alarm_code);
				      		});
				      		var json = {
				      			date : date,
				      			time : time,
				      			system_name : system_name,
				      			sys_sub_name : sys_sub_name,
				      			type : type,
				      			code : code
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
		  function(callback){ //Threshold Query, hss-detail.js, fallback(3)
			  var system = [];
			  var th0 = [];
			  var th1 = [];
			  var th2 = [];
			  var th3 = [];
			  var th4 = [];
			  var th5 = [];
			  var th6 = [];
			  var th7 = [];
			  
			  mysqlDB.query('select system, th0, th1, th2, th3, th4, th5, th6, th7 from threshold_list where system like \'%HSS\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system.push(e.system);
				      			th0.push(e.th0);
				      			th1.push(e.th1);
				      			th2.push(e.th2);
				      			th3.push(e.th3);
				      			th4.push(e.th4);
				      			th5.push(e.th5);
				      			th6.push(e.th6);
				      			th7.push(e.th7);
				      		});
				      		var json = {
				      			system : system,
				      			th0 : th0,
				      			th1 : th1,
				      			th2 : th2,
				      			th3 : th3,
				      			th4 : th4,
				      			th5 : th5,
				      			th6 : th6,
				      			th7 : th7
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
	  ],
	  function(err,results){
	    if(err)console.log(err);
	    var result = {
	      result_code: result_code,
	      result_msg: result_msg,
	      result:results
	    };
	    res.send(JSON.stringify(result));
	  });	
});

router.get('/v1/hlr-list', function(req, res, next) {
	  /* API Send body */
		  var result_code = 1;
		  var result_msg = "success";
		  
		  async.parallel([
			  function(callback){
				  var system_name = [];
				  var system_type = [];
				  var curTps = [];
				  var totTps = [];
				  mysqlDB.query('select system_name, system_type, current_tps, max_tps from system_info_hlr;',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system_name.push(e.system_name);
				      			system_type.push(e.system_type);
				      			curTps.push(Math.round(e.current_tps));
				      			totTps.push(Math.round(e.max_tps));
				      		});
				      		var json = {
				      			system_name : system_name,
				      			system_type : system_type,
				      			curTps : curTps,
				      			totTps : totTps
				      		}
				      		callback(null,json);
				      	}
				  });
			  },
			  // Active HLR 요약 정보 전송
			  function(callback){
				  var curActiveCnt = [];
				  var totActiveCnt = [];
				  var curActiveTps = [];
				  var totActiveTps = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_hlr where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and system_type=' + '"A"'+ ') as curACnt, ' +
						  		'count(system_name) as totACnt, '+
						        'sum(current_tps) as curATps, ' +
						        '(select sum(max_tps) from system_info_hlr where system_type=' + '"A"'+ ') as totATps ' +
						        'from system_info_hlr where system_type=' + '"A"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curActiveCnt.push(e.curACnt);
					      			totActiveCnt.push(e.totACnt);
					      			curActiveTps.push(e.curATps);
					      			totActiveTps.push(e.totATps);
					      		});
					      		var json = {
					      			curActiveCnt : curActiveCnt,
					      			totActiveCnt : totActiveCnt,
					      			curActiveTps : curActiveTps,
					      			totActiveTps : totActiveTps
					      		};
					      		callback(null,json);
					      	};
					  });
			  },
			  
			  // 장애 SYSTEM Animation 표시
			  function(callback){
				  var system_name = [];

				  mysqlDB.query('select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\' and system_name LIKE ' + '"%HLR%"',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system_name.push(e.system_name);
				      		});
				      		var json = {
				      			system_name : system_name,
				      		}
				      		callback(null,json);
				      	}
				  });
			  },
			  
			  
			// BKUP HLR 요약 정보 전송
			  function(callback){
				  var curBKCnt = [];
				  var totBKCnt = [];
				  var curBKTps = [];
				  var totBKTps = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_hlr where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and system_type=' + '"BK"'+ ') as curBCnt, ' +
						  		'count(system_name) as totBCnt, '+
						        'sum(current_tps) as curBTps, ' +
						        '(select sum(max_tps) from system_info_hlr where system_type=' + '"BK"'+ ') as totBTps ' +
						        'from system_info_hlr where system_type=' + '"BK"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curBKCnt.push(e.curBCnt);
					      			totBKCnt.push(e.totBCnt);
					      			curBKTps.push(e.curBTps);
					      			totBKTps.push(e.totBTps);
					      		});
					      		var json = {
					      			curBKCnt : curBKCnt,
					      			totBKCnt : totBKCnt,
					      			curBKTps : curBKTps,
					      			totBKTps : totBKTps
					      		};
					      		callback(null,json);
					      	};
					  });
			  }
		
		  ],
		  function(err,results){
		    if(err)console.log(err);
		    var result = {
		      result_code: result_code,
		      result_msg: result_msg,
		      result:results
		    };
		    res.send(JSON.stringify(result));
		  });
});

router.get('/v1/hlr-list/:number', function(req, res, next) {
	  /* API Send body */
	  var result_code = 1;
	  var result_msg = "success";
	  
	  async.parallel([ //상면,세션,tps DATA Query, hlr-detail.js
		  function(callback){
			  var system_name = [];
			  var building = [];
			  var floor_plan = [];
			  var curTps = [];
			  var totTps = [];
			  mysqlDB.query('select system_name, building, floor_plan, current_tps, max_tps from system_info_hlr;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			building.push(e.building);
			      			floor_plan.push(e.floor_plan);
			      			curTps.push((e.current_tps));
			      			totTps.push((e.max_tps));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			building : building,
			      			floor_plan : floor_plan,
			      			curTps : curTps,
			      			totTps : totTps
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		  function(callback){ //통계 DATA Query, hlr-detail.js
			  var system_name = [];
			  var system_type = [];
			  var date = [];
			  var time = [];
			  var type = [];
			  var succ_rate = []; //timeout_event*1000/succ
			  var att = []; //timeout_event 값
	
			  mysqlDB.query('select hlr_stat_list.system_name, system_info_hlr.system_type, hlr_stat_list.date, hlr_stat_list.time, hlr_stat_list.type, hlr_stat_list.succ_rate, hlr_stat_list.att from hlr_stat_list, system_info_hlr where hlr_stat_list.system_name = system_info_hlr.system_name;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			system_type.push(e.system_type);
			      			date.push(e.date);
			      			time.push(e.time);
			      			type.push(e.type);
			      			succ_rate.push(Number(e.succ_rate)); //timeout_event*1000/succ
			      			att.push(Number(e.att));  //timeout_event 값
			      		});
			      		var json = {
			      			system_name : system_name,
			      			system_type : system_type,
			      			date : date,
			      			time : time,
			      			type : type,
			      			succ_rate : succ_rate,
							att : att 
			      		}
			      		callback(null,json);
			      	}
			  });

		  },
		  function(callback){ //알람 DATA Query, hlr-detail.js
			  var system_name = [];
			  var date = [];
			  var time = [];
			  var sys_sub_name = [];
			  var type = [];
			  var code = [];
			  
			  mysqlDB.query('select date, time, system_name, sys_sub_name, alarm_type, alarm_code from alarm_list where alarm_type=\'ALARM\' and alarm_mask=\'N\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			date.push(e.date);
				      			time.push(e.time);
				      			system_name.push(e.system_name);
				      			sys_sub_name.push(e.sys_sub_name);
				      			type.push(e.alarm_type);
				      			code.push(e.alarm_code);
				      		});
				      		var json = {
				      			date : date,
				      			time : time,
				      			system_name : system_name,
				      			sys_sub_name : sys_sub_name,
				      			type : type,
				      			code : code
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
		  function(callback){ //Threshold Query, hlr-detail.js, fallback(3)
			  var system = [];
			  var th0 = [];
			  var th1 = [];
			  
			  mysqlDB.query('select system, th0, th1 from threshold_list where system like \'%HLR\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system.push(e.system);
				      			th0.push(e.th0);
				      			th1.push(e.th1);
				      		});
				      		var json = {
				      			system : system,
				      			th0 : th0,
				      			th1 : th1
				      		}
				      		callback(null,json);
				      	}
				  });
		  }
	  ],
	  function(err,results){
	    if(err)console.log(err);
	    var result = {
	      result_code: result_code,
	      result_msg: result_msg,
	      result:results
	    };
	    res.send(JSON.stringify(result));
	  });	
});


router.get('/v1/auc-list', function(req, res, next) {
	  /* API Send body */
		  var result_code = 1;
		  var result_msg = "success";
		  
		  async.parallel([
			  function(callback){
				  var system_name = [];
				  var auc_num = [];
				  var system_type = [];
				  var curTps = [];
				  var totTps = [];
				  mysqlDB.query('select system_name, substring(system_name, 4, 2) AS auc_num, system_type, current_tps, max_tps from system_info_auc;',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system_name.push(e.system_name);
				      			auc_num.push(e.auc_num)
				      			system_type.push(e.system_type);
				      			curTps.push(e.current_tps);
				      			totTps.push(e.max_tps);
				      		});
				      		var json = {
				      			system_name : system_name,
				      			auc_num : auc_num,
				      			system_type : system_type,
				      			curTps : curTps,
				      			totTps : totTps
				      		}
				      		callback(null,json);
				      	}
				  });
			  },
			  // AuC21_MP0, MP1 요약 정보 전송
			  function(callback){
				  var curAuC21Cnt = [];
				  var totAuC21Cnt = [];
				  var curAuC21Tps = [];
				  var totAuC21Tps = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_auc where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and system_name like ' + '"AUC21%"'+ ') as curA21Cnt, ' +
						  		'count(system_name) as totA21Cnt, '+
						        'sum(current_tps) as curA21Tps, ' +
						        '(select sum(max_tps) from system_info_auc where system_name like ' + '"AUC21%"'+ ') as totA21Tps ' +
						        'from system_info_auc where system_name like ' + '"AUC21%"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curAuC21Cnt.push(e.curA21Cnt);
					      			totAuC21Cnt.push(e.totA21Cnt);
					      			curAuC21Tps.push(e.curA21Tps);
					      			totAuC21Tps.push(e.totA21Tps);
					      		});
					      		var json = {
					      			curAuC21Cnt : curAuC21Cnt,
					      			totAuC21Cnt : totAuC21Cnt,
					      			curAuC21Tps : curAuC21Tps,
					      			totAuC21Tps : totAuC21Tps
					      		};
					      		callback(null,json);
					      	};
					  });
			  },
			  
			  // 장애 SYSTEM Animation 표시
			  function(callback){
				  var system_name = [];

				  mysqlDB.query('select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\' and system_name LIKE ' + '"%AUC%"',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system_name.push(e.system_name);
				      		});
				      		var json = {
				      			system_name : system_name,
				      		}
				      		callback(null,json);
				      	}
				  });
			  },
			  
			// AuC22_MP0, MP1 요약 정보 전송
			  function(callback){
				  var curAuC22Cnt = [];
				  var totAuC22Cnt = [];
				  var curAuC22Tps = [];
				  var totAuC22Tps = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_auc where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and system_name like ' + '"AUC22%"'+ ') as curA22Cnt, ' +
						  		'count(system_name) as totA22Cnt, '+
						        'sum(current_tps) as curA22Tps, ' +
						        '(select sum(max_tps) from system_info_auc where system_name like ' + '"AUC22%"'+ ') as totA22Tps ' +
						        'from system_info_auc where system_name like ' + '"AUC22%"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curAuC22Cnt.push(e.curA22Cnt);
					      			totAuC22Cnt.push(e.totA22Cnt);
					      			curAuC22Tps.push(e.curA22Tps);
					      			totAuC22Tps.push(e.totA22Tps);
					      		});
					      		var json = {
					      			curAuC22Cnt : curAuC22Cnt,
					      			totAuC22Cnt : totAuC22Cnt,
					      			curAuC22Tps : curAuC22Tps,
					      			totAuC22Tps : totAuC22Tps
					      		};
					      		callback(null,json);
					      	};
					  });
			  },
			  
			// AuC25 요약 정보 전송
			  function(callback){
				  var curAuC25Cnt = [];
				  var totAuC25Cnt = [];
				  var curAuC25Tps = [];
				  var totAuC25Tps = [];
				  
				  mysqlDB.query('select (select count(system_name) from system_info_auc where not system_name in (select distinct system_name from alarm_list where alarm_type in (\'ALARM\',\'STAT\') and alarm_mask =\'N\') and system_name like ' + '"AUC25%"'+ ') as curA25Cnt, ' +
						  		'count(system_name) as totA25Cnt, '+
						        'sum(current_tps) as curA25Tps, ' +
						        '(select sum(max_tps) from system_info_auc where system_name like ' + '"AUC25%"'+ ') as totA25Tps ' +
						        'from system_info_auc where system_name like ' + '"AUC25%"',
						  function(error, results, fields) {
						  	if (error) {
					      		console.log(error);
					      	} else {
					      		results.forEach(function(e) {
					      			curAuC25Cnt.push(e.curA25Cnt);
					      			totAuC25Cnt.push(e.totA25Cnt);
					      			curAuC25Tps.push(e.curA25Tps);
					      			totAuC25Tps.push(e.totA25Tps);
					      		});
					      		var json = {
					      			curAuC25Cnt : curAuC25Cnt,
					      			totAuC25Cnt : totAuC25Cnt,
					      			curAuC25Tps : curAuC25Tps,
					      			totAuC25Tps : totAuC25Tps
					      		};
					      		callback(null,json);
					      	};
					  });
			  }
		
		  ],
		  function(err,results){
		    if(err)console.log(err);
		    var result = {
		      result_code: result_code,
		      result_msg: result_msg,
		      result:results
		    };
		    res.send(JSON.stringify(result));
		  });
});

router.get('/v1/auc-list/:number', function(req, res, next) {
	  /* API Send body */
	  var result_code = 1;
	  var result_msg = "success";
	  
	  async.parallel([ //상면,세션,tps DATA Query, auc-detail.js
		  function(callback){
			  var system_name = [];
			  var building = [];
			  var floor_plan = [];
			  var curTps = [];
			  var totTps = [];
			  mysqlDB.query('select system_name, building, floor_plan, current_tps, max_tps from system_info_auc;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			building.push(e.building);
			      			floor_plan.push(e.floor_plan);
			      			curTps.push((e.current_tps));
			      			totTps.push((e.max_tps));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			building : building,
			      			floor_plan : floor_plan,
			      			curTps : curTps,
			      			totTps : totTps
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		  function(callback){ //통계 DATA Query, auc-detail.js  fallback(1)
			  var system_name = [];
			  var auc_num = [];
			  var system_type = [];
			  var date = [];
			  var time = [];
			  var type = [];
			  var succ_rate = [];
			  var att = [];
			  mysqlDB.query('select s.system_name, substring(s.system_name,4,2) AS auc_num, i.system_type ,s.date, s.time, s.type, s.succ_rate, s.att from auc_stat_list AS s, system_info_auc AS i where s.system_name = i.system_name;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			auc_num.push(e.auc_num);
			      			system_type.push(e.system_type);
			      			date.push(e.date);
			      			time.push(e.time);
			      			type.push(e.type);
			      			succ_rate.push(Number(e.succ_rate));
			      			att.push(Number(e.att));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			auc_num : auc_num,
			      			system_type : system_type,
			      			date : date,
			      			time : time,
			      			type : type,
			      			succ_rate : succ_rate,
			      			att : att
			      		}
			      		callback(null,json);
			      	}
			  });

		  },
		  function(callback){ //알람 DATA Query, auc-detail.js  fallback(2)
			  var system_name = [];
			  var date = [];
			  var time = [];
			  var sys_sub_name = [];
			  var type = [];
			  var code = [];
			  
			  mysqlDB.query('select date, time, system_name, sys_sub_name, alarm_type, alarm_code from alarm_list where alarm_type=\'ALARM\' and alarm_mask=\'N\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			date.push(e.date);
				      			time.push(e.time);
				      			system_name.push(e.system_name);
				      			sys_sub_name.push(e.sys_sub_name);
				      			type.push(e.alarm_type);
				      			code.push(e.alarm_code);
				      		});
				      		var json = {
				      			date : date,
				      			time : time,
				      			system_name : system_name,
				      			sys_sub_name : sys_sub_name,
				      			type : type,
				      			code : code
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
		  function(callback){ //Threshold Query, auc-detail.js, fallback(3)
			  var system = [];
			  var th0 = [];
			  var th1 = [];
			  var th2 = [];
			  var th3 = [];
			  var th4 = [];
			  var th5 = [];
			  var th6 = [];
			  var th7 = [];
			  
			  mysqlDB.query('select system, th0, th1, th2, th3, th4, th5, th6, th7 from threshold_list where system like \'%AUC%\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system.push(e.system);
				      			th0.push(e.th0);
				      			th1.push(e.th1);
				      			th2.push(e.th2);
				      			th3.push(e.th3);
				      			th4.push(e.th4);
				      			th5.push(e.th5);
				      			th6.push(e.th6);
				      			th7.push(e.th7);
				      		});
				      		var json = {
				      			system : system,
				      			th0 : th0,
				      			th1 : th1,
				      			th2 : th2,
				      			th3 : th3,
				      			th4 : th4,
				      			th5 : th5,
				      			th6 : th6,
				      			th7 : th7
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
	  ],
	  function(err,results){
	    if(err)console.log(err);
	    var result = {
	      result_code: result_code,
	      result_msg: result_msg,
	      result:results
	    };
	    res.send(JSON.stringify(result));
	  });	
});

router.get('/v1/ucms-detail', function(req, res, next) {
	  /* API Send body */
	  var result_code = 1;
	  var result_msg = "success";
	  
	  async.parallel([ //상면,세션,tps DATA Query, ucms-detail.js
		  function(callback){
			  var system_name = [];
			  var building = [];
			  var floor_plan = [];
			  var curTps = [];
			  var totTps = [];
			  mysqlDB.query('select system_name, building, floor_plan, current_tps, max_tps from system_info_ucms;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			building.push(e.building);
			      			floor_plan.push(e.floor_plan);
			      			curTps.push((e.current_tps));
			      			totTps.push((e.max_tps));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			building : building,
			      			floor_plan : floor_plan,
			      			curTps : curTps,
			      			totTps : totTps
			      		}
			      		callback(null,json);
			      	}
			  });
		  },
		  function(callback){ //통계 DATA Query, ucms-detail.js  fallback(1)
			  var system_name = [];
			  var system_type = [];
			  var date = [];
			  var time = [];
			  var type = [];
			  var succ_rate = [];
			  var att = [];
			  mysqlDB.query('select s.system_name, i.system_type , s.date, s.time, s.type, s.succ_rate, s.att from ucms_stat_list AS s, system_info_ucms AS i where s.system_name = i.system_name;',
				  function(error, results, fields) {
				  	if (error) {
			      		console.log(error);
			      	} else {
			      		results.forEach(function(e) {
			      			system_name.push(e.system_name);
			      			system_type.push(e.system_type);
			      			date.push(e.date);
			      			time.push(e.time);
			      			type.push(e.type);
			      			succ_rate.push(Number(e.succ_rate));
			      			att.push(Number(e.att));
			      		});
			      		var json = {
			      			system_name : system_name,
			      			system_type : system_type,
			      			date : date,
			      			time : time,
			      			type : type,
			      			succ_rate : succ_rate,
			      			att : att
			      		}
			      		callback(null,json);
			      	}
			  });

		  },
		  function(callback){ //알람 DATA Query, ucms-detail.js  fallback(2)
			  var system_name = [];
			  var date = [];
			  var time = [];
			  var sys_sub_name = [];
			  var type = [];
			  var code = [];
			  
			  mysqlDB.query('select date, time, system_name, sys_sub_name, alarm_type, alarm_code from alarm_list where alarm_type=\'ALARM\' and alarm_mask=\'N\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			date.push(e.date);
				      			time.push(e.time);
				      			system_name.push(e.system_name);
				      			sys_sub_name.push(e.sys_sub_name);
				      			type.push(e.alarm_type);
				      			code.push(e.alarm_code);
				      		});
				      		var json = {
				      			date : date,
				      			time : time,
				      			system_name : system_name,
				      			sys_sub_name : sys_sub_name,
				      			type : type,
				      			code : code
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
		  function(callback){ //Threshold Query, auc-detail.js, fallback(3)
			  var system = [];
			  var th0 = [];
			  var th1 = [];
			  var th2 = [];
			  var th3 = [];
			  var th4 = [];
			  var th5 = [];
			  var th6 = [];
			  var th7 = [];
			  var th8 = [];
			  var th9 = [];
			  
			  mysqlDB.query('select system, th0, th1, th2, th3, th4, th5, th6, th7, th8, th9 from threshold_list where system like \'%UCMS%\';',
					  function(error, results, fields) {
					  	if (error) {
				      		console.log(error);
				      	} else {
				      		results.forEach(function(e) {
				      			system.push(e.system);
				      			th0.push(e.th0);
				      			th1.push(e.th1);
				      			th2.push(e.th2);
				      			th3.push(e.th3);
				      			th4.push(e.th4);
				      			th5.push(e.th5);
				      			th6.push(e.th6);
				      			th7.push(e.th7);
				      			th8.push(e.th8);
				      			th9.push(e.th9);
				      		});
				      		var json = {
				      			system : system,
				      			th0 : th0,
				      			th1 : th1,
				      			th2 : th2,
				      			th3 : th3,
				      			th4 : th4,
				      			th5 : th5,
				      			th6 : th6,
				      			th7 : th7,
				      			th8 : th8,
				      			th9 : th9
				      		}
				      		callback(null,json);
				      	}
				  });
		  },
	  ],
	  function(err,results){
	    if(err)console.log(err);
	    var result = {
	      result_code: result_code,
	      result_msg: result_msg,
	      result:results
	    };
	    res.send(JSON.stringify(result));
	  });	
});
/* ---------------------------------------sj 2020.05.18~ end-----------------------------------*/

module.exports = router;
