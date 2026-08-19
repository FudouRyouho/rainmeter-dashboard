(function () {
  var U = window.RainmeterUtils;
  var GH = window.GraphHelper;

  /**
   * Auditoría v0.0.2: Estabilización del bundle NET
   */
  function start() {
    U.whenReady(function (api) {
      var measures = {
        up: U.getMeasure(api, 'NetUp'),
        down: U.getMeasure(api, 'NetDown'),
        upTot: U.getMeasure(api, 'NetUpTotal'),
        downTot: U.getMeasure(api, 'NetDownTotal'),
        ping: U.getMeasure(api, 'PingExt'),
        pubIp: U.getMeasure(api, 'PublicIP'),
        ips: U.getMeasures(api, ['IP0', 'IP1', 'IP2', 'IP3']),
      };

      var ringUp = GH.createRing(60), ringDown = GH.createRing(60);
      var S = { upKbps: 0, downKbps: 0, upTotMB: 0, downTotMB: 0, ip: '', pubIP: '', pingMs: null };

      function getIPv4() {
        try {
          for (var i = 0; i < measures.ips.length; i++) {
            var ip = measures.ips[i].getString();
            if (ip && ip !== '0.0.0.0' && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
          }
        } catch(e){}
        return '—';
      }

      function measure() {
        try {
          U.updateAll([measures.up, measures.down, measures.upTot, measures.downTot, measures.ping, measures.pubIp]);
        } catch (e) { }
      }

      function compute() {
        try {
          S.upKbps = (measures.up ? measures.up.getNumber() : 0) / 1000;
          S.downKbps = (measures.down ? measures.down.getNumber() : 0) / 1000;
          S.upTotMB = (measures.upTot ? measures.upTot.getNumber() : 0) / (1024 * 1024);
          S.downTotMB = (measures.downTot ? measures.downTot.getNumber() : 0) / (1024 * 1024);
          S.ip = getIPv4();
          S.pubIP = measures.pubIp ? measures.pubIp.getString() : '—';
          S.pingMs = measures.ping ? measures.ping.getNumber() : null;

          GH.push(ringUp, S.upKbps);
          GH.push(ringDown, S.downKbps);
        } catch (e) { }
      }

      function render() {
        try {
          U.setField('net-ip', 'IP: ' + S.ip);
          U.setField('net-ipPublic', 'Public: ' + S.pubIP);
          U.setField('net-ping', S.pingMs ? AlertHelper.fmtMs(S.pingMs) : '-- ms');
          U.setField('net-totalUp', AlertHelper.fmtMBorGB(S.upTotMB));
          U.setField('net-totalDown', AlertHelper.fmtMBorGB(S.downTotMB));
          U.setField('net-up', AlertHelper.fmtNetKbpsMbps(S.upKbps));
          U.setField('net-down', AlertHelper.fmtNetKbpsMbps(S.downKbps));

          var rightRoot = U.getRightRoot('net');
          U.setField('net-right-ipPublic', S.pubIP, rightRoot);
          U.setField('net-right-ping', S.pingMs ? AlertHelper.fmtMs(S.pingMs) : '-- ms', rightRoot);
          U.setField('net-right-up', AlertHelper.fmtNetKbpsMbps(S.upKbps), rightRoot);
          U.setField('net-right-down', AlertHelper.fmtNetKbpsMbps(S.downKbps), rightRoot);
          U.setField('net-right-totalUp', AlertHelper.fmtMBorGB(S.upTotMB), rightRoot);
          U.setField('net-right-totalDown', AlertHelper.fmtMBorGB(S.downTotMB), rightRoot);


          U.setState('net-ping', S.pingMs || 0, 'net-pingMs');

          var scaleUp = Math.max(5000, GH.ringMax(ringUp) * 1.2);
          var scaleDown = Math.max(5000, GH.ringMax(ringDown) * 1.2);

          document.querySelectorAll('path[data-series="net-up"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(ringUp, s.width, s.height, 2, 2, 0, 0, 0, scaleUp));
          });
          document.querySelectorAll('path[data-series="net-down"]').forEach(el => {
            var s = GH.getSizeForPath(el);
            U.setPathD(el, GH.toPathFromRing(ringDown, s.width, s.height, 2, 2, 0, 0, 0, scaleDown));
          });

        } catch (e) { }
      }

      if (window.HeartbeatInstance) {
        HeartbeatInstance.subscribe('net-m', measure, { phase: 'measure' });
        HeartbeatInstance.subscribe('net-c', compute, { phase: 'compute' });
        HeartbeatInstance.subscribe('net-r', render, { phase: 'render' });
      }
    });
  }

  start();
})();
