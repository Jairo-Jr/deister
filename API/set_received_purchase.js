function main(data) { 

    // Definición de variables
    var mArrayPurchaseItems = [];
    var mObjMessageResponse = {};
    var mArrRequired = [];
    var mDateToday = new Ax.util.Date();

    var mStrMssgError = null;
    var mDateError = null;
    let mIntCantPedidos = null;
    var mStrState = '0';
    var mDateExpDate = null;
    var i = 0;

    // Validación de campos requeridos
    if (!data.CodeOC) mArrRequired.push('CodeOC');

    if (!data.GR)     mArrRequired.push('GR');

    data.PurchaseItem.forEach(item => {
        if (!item.Code) mArrRequired.push(`PurchaseItem[${i}].Code`);

        if (!item.Qty) mArrRequired.push(`PurchaseItem[${i}].Qty`);

        i++;
    });

    if (mArrRequired.length) {  // Si algún campo requerido fue obviado.
        
        mObjMessageResponse = {
            "Response": {
                "Status": "ERROR",
                "Message": `El/los campo(s) [${mArrRequired}] son requeridos.`
            }
        }; 
    
        return new Ax.net.HttpResponseBuilder()
            .status(422)
            .entity(mObjMessageResponse)
            .type("application/json")
            .build();
    } 

    // 
    try {

        // Validación de la existencia de código de la orden de compra 
        mIntCantPedidos = Ax.db.executeGet(`
            <select>
                <columns>
                    COUNT(*)
                </columns>
                <from table='gcompedh'/>
                <where>
                    docser = ?
                </where>
            </select> 
        `, data.CodeOC); 

        // Si no existe código de la orden de compra
        if(!mIntCantPedidos) { 
            // Se establece como error, agregando mensaje, fecha y estado 
            mStrMssgError = `Código de la Orden de Compra [${data.CodeOC}] no existe.`;
            mDateError = mDateToday;
            mStrState = '3';
        } 

        var mStrJsonData = JSON.stringify(data);

        // Registro de data de Orden de Compra
        var mIntSerial = Ax.db.insert('crp_ibth_setreceivedpurchase_h', 
            {
                codeoc:                 data.CodeOC,
                gr:                     data.GR,
                version:                data.Version,
                state:                  mStrState,
                json_receivedpurchase:  mStrJsonData,
                date_received:          mDateToday,
                message_error:          mStrMssgError,
                date_error:             mDateError
            }
        ).getSerial();


        data.PurchaseItem.forEach(item => { 

            // Se da formato a la fecha de expiracion
            if(item.Batch.ExpDate) {
                mDateExpDate = new Ax.util.Date(item.Batch.ExpDate);
                mDateExpDate = mDateExpDate.format("yyyy-MM-dd HH:mm:ss");
            } else {
                mDateExpDate = null;
            }

            mArrayPurchaseItems.push({
                id_receivedpurchase_h:  mIntSerial,
                numline:                item.NumLine,
                code:                   item.Code,
                brand:                  item.Variante.Brand,
                size:                   item.Variante.Size,
                lab:                    item.Variante.Lab,
                qty:                    item.Qty,
                serial:                 item.Serial,
                batchcode:              item.Batch.Code,
                expdate:                mDateExpDate,
                warehouse:              item.Warehouse
            });

        }); 

        // Registro de productos 
        Ax.db.insert('crp_ibth_setreceivedpurchase_l', mArrayPurchaseItems);

    } catch (error) {
        
        mObjMessageResponse = {
            "Response": {
                "Status": "ERROR",
                "Message": `${error.message}`
            }
        }; 
    
        return new Ax.net.HttpResponseBuilder()
            .status(400)
            .entity(mObjMessageResponse)
            .type("application/json")
            .build();
    } 

    // Si no existe código de la orden de compra
    if(!mIntCantPedidos) {
        mObjMessageResponse = {
            "Response": {
                "Status": "ERROR",
                "Message": `Código de la Orden de Compra [${data.CodeOC}] no existe.`
            }
        }; 
    
        return new Ax.net.HttpResponseBuilder()
            .status(422)
            .entity(mObjMessageResponse)
            .type("application/json")
            .build();
            
    } else { // Si se registro correctamente 
        mObjMessageResponse = {
            "Response": {
                "Status": "OK",
                "Message": `Registro realizado`
            }
        }; 
    
        return new Ax.net.HttpResponseBuilder()
            .status(201)
            .entity(mObjMessageResponse)
            .type("application/json")
            .build();
    } 
    
}
