//@graal
function main(data) {
    
    var mObjComprobante             = {};
    var mArrComprobanteDetalle      = [];
    var mArrComprobanteDetallePago  = [];
    var mStrMessageError            = '';
    var mObjResponse                = {};

    /**    
     * Guardar cabecera del comprobante.
     */
    mObjComprobante = data;
    
   /**    
     * Se cambia el nombre de la columna por ser muy extenso
     * (Nombre de la columna tiene que tener como máximo 30 caracteres)
     */
    mObjComprobante.seriecorrelativocomprobsunat   = data.seriecorrelativocomprobantesunat;
    mObjComprobante.numerosesioncajeroaplicacancel = data.numerosesioncajeroaplicacancelanc;
    
    /**    
     * Guardar líneas del comprobante detalle.
     */
    mObjComprobante.comprobantedetalle.forEach(function(mObjCDetalle) {
        mArrComprobanteDetalle.push(mObjCDetalle);
    });
    
    /**    
     * Guardar líneas del comprobante detalle pago.
     */
    mObjComprobante.comprobantedetallepago.forEach(function(mObjCDetallePago) {
        mArrComprobanteDetallePago.push(mObjCDetallePago);
    });
    
    /**    
     * Validar que se tenga la información en los detalles.
     */
    if(mArrComprobanteDetalle.length == 0){
        mStrMessageError = 'comprobantedetalle sin información';
    }
    
    if(mArrComprobanteDetalle.length == 0){
        mArrComprobanteDetallePago = 'comprobantedetallepago sin información';
    }
    
    /**    
     * Validar campos requeridos a nivel del comprobante detalle
     */
    for(var mObjComprobanteDetalle of mArrComprobanteDetalle){
    
        if (!mObjComprobanteDetalle.idcomprobanteitem || mObjComprobanteDetalle.idcomprobanteitem == "NULL"){
            mStrMessageError = mStrMessageError + `Id comprobante item no informado.`;
        }
    
        if (!mObjComprobanteDetalle.idcomprobante || mObjComprobanteDetalle.idcomprobante == "NULL"){
            mStrMessageError = mStrMessageError + `Id comprobante no informado.`;
        }
    
        if (!mObjComprobanteDetalle.importetotal || mObjComprobanteDetalle.importetotal == "NULL"){
            mStrMessageError = mStrMessageError + `Importe total no informado. `;
        } 
    }
    
    /**    
     * Validar campos requeridos a nivel del comprobante detalle
     */
    for(var mObjComprobanteDetalle of mArrComprobanteDetalle){
    
        if (!mObjComprobanteDetalle.idcomprobanteitem || mObjComprobanteDetalle.idcomprobanteitem == "NULL"){
            mStrMessageError = mStrMessageError + `Id comprobante item no informado.`;
        }
    
        if (!mObjComprobanteDetalle.idcomprobante || mObjComprobanteDetalle.idcomprobante == "NULL"){
            mStrMessageError = mStrMessageError + `Id comprobante no informado.`;
        }
    
        if (!mObjComprobanteDetalle.importetotal || mObjComprobanteDetalle.importetotal == "NULL"){
            mStrMessageError = mStrMessageError + `Importe total no informado. `;
        } 
    }
    
    /**    
     * Validar campos requeridos a nivel del comprobante detalle pago.
     */
    for(var mObjComprobanteDetallePago of mArrComprobanteDetallePago){
    
        if (!mObjComprobanteDetallePago.idcomprobantedetallepago || mObjComprobanteDetallePago.idcomprobantedetallepago == "NULL"){
            mStrMessageError = mStrMessageError + `Id comprobante detalle pago  no informado.`;
        }
    
        if (!mObjComprobanteDetallePago.idcomprobante || mObjComprobanteDetallePago.idcomprobante == "NULL"){
            mStrMessageError = mStrMessageError + `Id comprobante no informado.`;
        }
    
        if (!mObjComprobanteDetallePago.tipocambio_dolar || mObjComprobanteDetallePago.tipocambio_dolar == "NULL"){
            mStrMessageError = mStrMessageError + `Tipo de cambio dolar no informado.`;
        } 
        
        if (!mObjComprobanteDetallePago.montorecibido || mObjComprobanteDetallePago.montorecibido == "NULL"){
            mStrMessageError = mStrMessageError + `Monto recibido no informado.`;
        } 
        
        if (!mObjComprobanteDetallePago.estado || mObjComprobanteDetallePago.estado == "NULL"){
            mStrMessageError = mStrMessageError + `Estado no informado.`;
        } 
    }
    
    if (mStrMessageError){
        
        mObjResponse = { 
                            response : { 
                                            code          : '406',
                                            message       : `${mStrMessageError}`,
                                            idcomprobante : data.idcomprobante
                                        }
                        };

        return new Ax.net.HttpResponseBuilder()            
                .status(406)
                .entity(mObjResponse)
                .type("application/json")
                .build();
    }
    
    /**    
     * Variables generales
     */
    var mObjData         = mObjComprobante; 
    var mDateToday       = new Ax.util.Date();
    var mStrUserCode     = Ax.db.getUser()
    var mStrMensajeError = '';
    var mStrMensaje      = 'Recibido correctamente.'; 
        
    try {
        Ax.db.beginWork();
        
        /**    
         *  Guardamos Json recibido y agregar datos de control
         */
        mObjData.json_comprobante  = JSON.stringify(mObjComprobante);
        mObjData.date_received     = mDateToday;
        mObjData.user_received     = mStrUserCode;
        
        /**    
         * Insertar comprobante cabecera.
         */
        var mIntIdReciboPago = Ax.db.insert('crp_crpi_comprobante', mObjData).getSerial();
  
        /**    
         * Insertar comprobante detalle.
         */
        for (var mObjComprobanteDetalle of mArrComprobanteDetalle) { 
            
            mObjComprobanteDetalle.idrecibopago    = mIntIdReciboPago; 
            mObjComprobanteDetalle.date_received   = mDateToday;
            
            Ax.db.insert('crp_crpi_comprobante_detalle', mObjComprobanteDetalle);
        } 
        
        /**    
         * Insertar comprobante detalle pago.
         */
        for (var mObjComprobanteDetallePago of mArrComprobanteDetallePago) { 
            
            mObjComprobanteDetallePago.idrecibopago    = mIntIdReciboPago; 
            mObjComprobanteDetallePago.date_received   = mDateToday;
            
            Ax.db.insert('crp_crpi_comprobante_detalle_pago', mObjComprobanteDetallePago);
        } 

        /**    
         * Definición de mensaje de respuesta positiva
         */
        mObjResult = {
            response : {  
                code             : '201',
                message          : mStrMensaje,
                idrecibo         : mIntIdReciboPago,
                numeromovimiento : '0'
            }
        };

        Ax.db.commitWork();
        
        return new Ax.net.HttpResponseBuilder()            
            .status(201)
            .entity(mObjResult)
            .type("application/json")
            .build(); 

    } catch (error) { 
        
        mStrMensajeError = `ERROR [${error.message || error}]`;
        
        mObjResult =  { response : { code    : '406',
                                      message : `${mStrMensajeError}`
                                   }
                        };
        
        return new Ax.net.HttpResponseBuilder()            
        .status(406)
        .entity(mObjResult)
        .type("application/json")
        .build();
    } 
}