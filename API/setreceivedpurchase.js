function main(data) {

    var mStrJsonData = JSON.stringify(data);
    // Registro de data de Orden de Compra
    var mObjRes = Ax.db.insert('crp_ibth_setreceivedpurchase_h', {
        codcom: data.code,
        codgr: data.gr,
        json_receivedpurchase: mStrJsonData
    });

    data.purchaseitem.forEach(item => {

        // Registro de productos
        Ax.db.insert('crp_ibth_setreceivedpurchase_l', {
            id_receivedpurchase_h: mObjRes.serial,
            numline: item.numline,
            codprod: item.code,
            marca: item.variante.brand,
            size: item.variante.size,
            lab: item.variante.lab,
            cantidad: item.qty,
            serial: item.serial,
            lote: item.batch.code,
            fecven: item.batch.expdate,
            almacen: item.warehouse
        });
    });

    return new Ax.net.HttpResponseBuilder()
        .status(201)
        .entity({
            "message": "OK"
        })
        .type("application/json")
        .build();
}