DEFAULT_CONFIG = { width: 290, height: 50, delay: 1000, dataSize: 25};

function getGraph(id, config) {

    if (config == undefined) { config = DEFAULT_CONFIG; }

    var graph = new Rickshaw.Graph({
            element: document.getElementById(id),
            width: config.width,
            height: config.height,
            renderer: 'line',
            interpolation: 'basis',
            series: new Rickshaw.Series.FixedDuration(
                [{ name: 'mem' }],
                undefined,
                { timeInterval: config.delay,
                  maxDataPoints: 25,
                  timeBase: new Date().getTime() / 1000 })
    });

    return graph;
}

function hookData(socket, watcher, graph, config) {
    socket.on('stats-' + watcher, function(data) {
        // cap to 100
        if (data.cpu > 100) { data.cpu = 100; }
        if (data.mem > 100) { data.mem = 100; }

        $('#' + watcher + '_last_mem').text(parseInt(data.mem) + '%');
        $('#' + watcher + '_last_cpu').text(parseInt(data.cpu) + '%');

        graph.series.addData(data);
        graph.render();
    });
}


function supervise(socket, watchers, watchersWithPids, config) {

    if (watchersWithPids == undefined) { watchersWithPids = []; }
    if (config == undefined) { config = DEFAULT_CONFIG; }

    watchers.forEach(function(watcher) {
        graph = getGraph(watcher, config);
        hookData(socket, watcher, graph, config);
    });

    watchersWithPids.forEach(function(watcher) {
        // get the list of processes for this watcher from the server
        socket.on('stats-' + watcher + '-pids', function(data) {
            data.pids.forEach(function(pid) {
                var id = watcher + '-' + pid;
                graph = getGraph(id, config);
                hookData(socket, id, graph, config);
            });
        });
    });

    // start the streaming of data, once the callbacks in place.
    socket.emit('get_stats', { watchers: watchers,
                               watchersWithPids: watchersWithPids});
}
