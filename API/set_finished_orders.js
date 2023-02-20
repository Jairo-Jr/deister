function main(data) {

    try {
        // Transformación a string el JSON recibido.
        var mStrJsonData = JSON.stringify(data);

        // Iteracion de órdenes de pedidos finalizados (outputorders)
        data.outputorders.forEach(mObjOrderH => {
            // mObjOrderH.json_finishedorders = mStrJsonData;
            // Registro de la data de cabecera
            var mIntSerialOrderH = Ax.db.insert('crp_ibth_setfinishedorders_h', {
                orderclient: mObjOrderH.OrderClient,
                orderibt: mObjOrderH.OrderIBT,
                ordertype: mObjOrderH.OrderType,
                version: mObjOrderH.Version,
                json_finishedorders: mStrJsonData
            }).getSerial();

            var mIntSerialOrderH = Ax.db.insert('crp_ibth_setfinishedorders_h', mObjOrderH).getSerial();

            // Iteracion de líneas del pedido (orderitem)
            mObjOrderH.OrderItem.forEach(mObjOrderL => {

                // Registro de la data de líneas
                Ax.db.insert('crp_ibth_setfinishedorders_l', {
                    id_finishedorders_h: mIntSerialOrderH,
                    numline: mObjOrderL.NumLine,
                    containercode: mObjOrderL.ContainerCode,
                    qtyrequested: mObjOrderL.QtyRequested,
                    qtyserved: mObjOrderL.QtyServed,
                    productcode: mObjOrderL.Code,
                    brand: mObjOrderL.Variante.Brand,
                    size: mObjOrderL.Variante.Size,
                    lab: mObjOrderL.Variante.Lab,
                    serial: mObjOrderL.Serial,
                    batchcode: mObjOrderL.Batch.Code,
                    expdate: mObjOrderL.Batch.ExpDate
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