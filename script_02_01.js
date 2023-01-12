/**
 *  Copyright (c) 1988-2019 deister software, All Rights Reserved.
 * 
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to 
 *  deister software and may be covered by trade secret or copyright law. 
 *  Dissemination of this information or reproduction of this material is strictly 
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed 
 * "Confidentiality and Non-disclosure" agreements explicitly covering such access.
 *  The copyright notice above does not evidence any actual or intended publication 
 *  for disclosure of this source code, which includes information that is confidential 
 *  and/or proprietary, and is a trade secret, of deister software
 * 
 *  ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 *  OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT THE 
 *  EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION
 *  OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.THE RECEIPT OR POSSESSION OF 
 *  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY
 *  RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE, 
 *  USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART.
 *
 *
 * -----------------------------------------------------------------------------
 * 
 *  JS: updateFacturaOrigen()
 *   
 *  Version:       V1.3
 *  Date:          2023.01.03
 *  Description:   Realiza el cambio a 'null' el protocolo ('auxchr5') de las 
 *                 facturas del tipo FFAR/FLOG que posteriormente se generó 
 *                 del tipo SFAR/SLOG
 * 
 *  CALLED FROM:
 *  ==============
 *      OBJ(botón cerrar):  crp_chv_planilla
 *
 *  PARAMETERS:
 *  =============
 * 
 *      @param   {string}   pStrProtocolo         Código de protocolo de facturas. 
 *      @param   {string}   pStrUsuario           Nombre de usuario que realiza 
 *                                                el envío a la BDI.   
 * 
 */ 
 function updateFacturaOrigen(pStrProtocolo, pStrUsuario) { 

    /**
     * Declaración de variables
     */ 
    var mDateToday   = new Ax.util.Date(); 

    /** 
     * Búsqueda de las facturas sustitutas (SFAR/SLOG) según el protocolo indicado.
     */
    var mRsFacturasSustituta = Ax.db.executeQuery(` 
        SELECT docrec,
               tercer 
         FROM gcomfach 
        WHERE gcomfach.auxchr5 = ? 
          AND gcomfach.tipdoc IN ('SFAR', 'SLOG') 
    `, pStrProtocolo);

    /** 
     * Iteración del grupo de facturas sustitutas.
     */
    for(let mRowFacturasSustituta of mRsFacturasSustituta) { 
        /** 
         * Búsqueda de las facturas origen (FFAR/FLOG) según el refter (referencia factura proveedor) / docser (documento de la factura)
         * y el tercer (código del proveedor) indicado de la factura sustituta.
         */
        var mRsFacturasOrigen = Ax.db.executeQuery(`
            SELECT cabid 
             FROM gcomfach 
            WHERE (gcomfach.docser = ? 
                  OR gcomfach.refter = ?)
             AND  gcomfach.tercer = ? 
             AND  gcomfach.tipdoc IN ('FFAR', 'FLOG')
        `, mRowFacturasSustituta.docrec, mRowFacturasSustituta.docrec, mRowFacturasSustituta.tercer);

        /** 
         * Cambio a 'null' el auxchr5 (Protocolo) de las facturas origen 
         * encontradas que hayan sido generadas su factura sustituta.
         */
        for(let mRowFacturasOrigen of mRsFacturasOrigen) { 

            Ax.db.update(`gcomfach`, 
                {   
                    auxchr5      : null,
                    user_updated : pStrUsuario,
                    date_updated : mDateToday
                }, 
                {
                    cabid: mRowFacturasOrigen.cabid
                }
            ); 
        }
    }

}