function main(data) {

    try {
        
        // Registro de data de Orden de Compra 

        data.inventoryproduct.forEach(mObjProduct => {
            var mStrJsonData = JSON.stringify(mObjProduct);

            // Registro de productos
            Ax.db.insert('crp_ibth_setinventorycount', { 
                qtysystem:                  mObjProduct.qtysystem,
                qtyreal:                    mObjProduct.qtyreal,
                productcode:                mObjProduct.code,
                brand:                      mObjProduct.variante.brand,
                size:                       mObjProduct.variante.size,
                lab:                        mObjProduct.variante.lab,
                serial:                     mObjProduct.serial,
                batchcode:                  mObjProduct.batch.code,
                expdate:                    mObjProduct.batch.expdate,
                json_inventorycount:        mStrJsonData
            });
        });

    } catch (error) {
        return new Ax.net.HttpResponseBuilder()
            .status(400)
            .entity({
                "Response": {
                    "Status": "ERROR",
                    "Message": error
                }
            })
            .type("application/json")
            .build();
    }


    return new Ax.net.HttpResponseBuilder()
        .status(201)
        .entity({
            "Response": {
                "Status": "OK",
                "Message": "Registro realizado"
            }
        })
        .type("application/json")
        .build();
}