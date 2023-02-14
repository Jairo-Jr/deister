function main(data) { 

    try {
        var mStrJsonData = JSON.stringify(data);
        // Registro de data de Orden de Compra
        var mIntSerial = Ax.db.insert('crp_ibth_setreceivedpurchase_h', {
            purchasecode: data.code,
            referralguide: data.gr,
            version: data.version,
            json_receivedpurchase: mStrJsonData
        }).getSerial();


        data.purchaseitem.forEach(item => {
            // Registro de productos
            Ax.db.insert('crp_ibth_setreceivedpurchase_l', {
                id_receivedpurchase_h: mIntSerial,
                numline: item.numline,
                productcode: item.code,
                brand: item.variante.brand,
                size: item.variante.size,
                lab: item.variante.lab,
                qty: item.qty,
                serial: item.serial,
                batchcode: item.batch.code,
                expdate: item.batch.expdate,
                warehouse: item.warehouse
            });
        });

    } catch (error) { 
        return new Ax.net.HttpResponseBuilder()
        .status(400)
        .entity({
            "status": "ERROR",
            "message": error
        })
        .type("application/json")
        .build();
    }


    return new Ax.net.HttpResponseBuilder()
        .status(201)
        .entity({
            "status": "OK",
            "message": "Registro realizado"
        })
        .type("application/json")
        .build();
}