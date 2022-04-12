const express = require('express')
const sqlite3 = require("sqlite3");

const app = express()
const port = 3000
const ohlc_api_endpoint = '/api/fx/ohlc/'

// DB connection
let db = null;
db = new sqlite3.Database('./db.sqlite3', err => {
    if (err) {
        return console.error(err.message);
    }
});

// embed data retrieve function
db.query = function (sql, params, callback) {
    this.all(sql, params, function (err, rows) {
        callback(err, rows);
    });
};

// route: return the latest price of instrument pair
app.get(ohlc_api_endpoint + ':pair', async (req, res) => {
    let pair = req.params.pair;

    // transform "pair" in url to sql parameter 
    pair_param = pair.substring(0, 3) + '/' + pair.substring(3);

    // use parameter to execute sql to avoid SQL injection
    const sql = `
                    SELECT pair, vwap 
                    FROM 'market_price' 
                    WHERE pair = ? 
                    ORDER BY startTime DESC 
                    LIMIT 0,1
                `;
    const params = [pair_param];

    await db.query(sql, params, (err, rows) => {
        let data = {};

        if (rows) {
            data = {
                "pair": rows[0].pair,
                "vwap": rows[0].vwap
            };
        };

        res.send(data);
    });
});

// route: return the high and low prices for each day
app.get(ohlc_api_endpoint + ':pair/history', async (req, res) => {
    let pair = req.params.pair;
    pair_param = pair.substring(0, 3) + '/' + pair.substring(3);

    const sql = `   
                    Select 	max(pair) as pair,
                        GMTDate,
                        max(high) as high,
                        min(low) as low
                    From (
                        SELECT 	pair,
                            date(datetime(endTime, 'unixepoch')) as GMTDate,
                            high,
                            low
                        from market_price
                        WHERE pair = ?
                    )
                    Group by GMTDate
                    order by GMTDate
                `;
    const params = [pair_param];

    await db.query(sql, params, (err, rows) => {
        let data = [];

        if (rows) {
            for (var obj of rows) {
                data.push([obj.pair, obj.GMTDate, obj.high, obj.low]);
            }
        }

        res.send(data);
    });
});

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})