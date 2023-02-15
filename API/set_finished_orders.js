function main(data) {

    try {
        // Transformación a string el JSON recibido.
        var mStrJsonData = JSON.stringify(data);

        // Iteracion de órdenes de pedidos finalizados (outputorders)
        data.outputorders.forEach(mObjOrderH => {
            mObjOrderH.json_receivedpurchase = mStrJsonData;
            // Registro de la data de cabecera
            // var mIntSerialOrderH = Ax.db.insert('crp_ibth_setfinishedorders_h', {
            //     orderclient: mObjOrderH.orderclient,
            //     orderibt: mObjOrderH.orderibt,
            //     ordertype: mObjOrderH.ordertype,
            //     version: mObjOrderH.version,
            //     json_receivedpurchase: mStrJsonData
            // }).getSerial();
            var mIntSerialOrderH = Ax.db.insert('crp_ibth_setfinishedorders_h', mObjOrderH).getSerial();

            // Iteracion de líneas del pedido (orderitem)
            mObjOrderH.orderitem.forEach(mObjOrderL => {

                // Registro de la data de líneas
                Ax.db.insert('crp_ibth_setfinishedorders_l', {
                    id_finishedorders_h: mIntSerialOrderH,
                    numline: mObjOrderL.numline,
                    containercode: mObjOrderL.containercode,
                    qtyrequested: mObjOrderL.qtyrequested,
                    qtyserved: mObjOrderL.qtyserved,
                    productcode: mObjOrderL.code,
                    brand: mObjOrderL.variante.brand,
                    size: mObjOrderL.variante.size,
                    lab: mObjOrderL.variante.lab,
                    serial: mObjOrderL.serial,
                    batchcode: mObjOrderL.batch.code,
                    expdate: mObjOrderL.batch.expdate
                });
            });
        });



    } catch (error) {
        return new Ax.net.HttpResponseBuilder()
            .status(400)
            .entity({
                "response": {
                    "status": "ERROR",
                    "message": error
                }
            })
            .type("application/json")
            .build();
    }


    return new Ax.net.HttpResponseBuilder()
        .status(201)
        .entity({
            "response": {
                "status": "OK",
                "message": "Registro realizado"
            }
        })
        .type("application/json")
        .build();
}