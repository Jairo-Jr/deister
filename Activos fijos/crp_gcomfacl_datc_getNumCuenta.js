/**
 *  Copyright (c) 1988-PRESENT deister software, All Rights Reserved.
 *
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to
 *  deister software and may be covered by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material is strictly
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed
 *  Confidentiality and Non-disclosure' agreements explicitly covering such access.
 *  The notice above does not evidence any actual or intended publication
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
 * -----------------------------------------------------------------------------
 * 
 * 
 *  JS:  crp_gcomfacl_datc_getNumCuenta
 * 
 *  Version     : V1.1
 *  Date        : 14-06-2023
 *  Description : Describe lo que hace la funcion
 * 
 * 
 *  LOCAL FUNCTIONS:
 *  ==================
 *      __getNumCuentaBien
 *      __getNumCuentaAsiento
 * 
 *  CALLED FROM:
 *  ==================
 *      iges_con_contab : [XSQL-SCRIPT]
 * 
 *  PARAMETERS:
 *  ==================
 *      @param   {integer}      pIntFileId      Identificador de la línea.
 *      @param   {float}        pFloatDebe      Monto correspondiente a la divisa del debe.
 *      @param   {float}        pFloatHaber     Monto correspondiente a la divisa del haber.
 * 
 **/
function crp_gcomfacl_datc_getNumCuenta(pIntLinid, pFloatDebe, pFloatHaber) {
    
    /**
     * LOCAL FUNCTION: __getNumCuentaBien
     * 
     * Description: Función local que obtiene el número de cuenta de 
     *              inmovilizado asociado al bien de la familia del artículo.
     * 
     * PARAMETERS:
     *      @param  {integer}     pIntLinid     Identificador de la línea.
     *      
     */
    function __getNumCuentaBien(pIntLinid) {
        var mStrNumCuentaBien = Ax.db.executeGet(`
                <select first='1'>
                    <columns>
                        cinmctas.ccinmo
                    </columns>
                    <from table='gcomfacl'>
                        <join table='garticul'>
                            <on>gcomfacl.codart = garticul.codigo</on>
                            <join table='gartfami'>
                                <on>garticul.codfam = gartfami.codigo</on>
                                <join table='cinmhead'>
                                    <on>gartfami.codinm = cinmhead.codinm</on>
                                    <join type='left' table='cempresa'>
                                        <on>cinmhead.empcode = cempresa.empcode</on>
                                        <on>cinmhead.codcta  = cinmctas.codigo</on>
                                        <join type='left' table='cinmctas'>
                                            <on>cempresa.placon  = cinmctas.placon</on>
                                        </join>
                                    </join>
                                </join>
                            </join>
                        </join>
                    </from>
                    <where>
                        gcomfacl.linid = ?
                    </where>
                </select>
            `, pIntLinid);
            
        return mStrNumCuentaBien;
    }
    
    /**
     * LOCAL FUNCTION: __getNumCuentaAsiento
     * 
     * Description: Función local que obtiene el número de cuenta de la línea 
     *              de asiento asociado a la tipología de la factura.
     * 
     * PARAMETERS:
     *      @param  {integer}     pIntLinid     Identificador de la línea.
     *      
     */
    function __getNumCuentaAsiento(pIntLinid) {
        var mStrNumCuentaAsiento = Ax.db.executeGet(`
                <select first='1'>
                    <columns>
                        DISTINCT gconasil.cuenta
                    </columns>
                    <from table='gcomfacl'>
                        <join table='gcomfach'>
                            <on>gcomfacl.cabid = gcomfach.cabid</on>
                            <join table='gcomfacd'>
                                <on>gcomfach.tipdoc = gcomfacd.codigo</on>
                                <join table='gconasih'>
                                    <on>gcomfacd.tipast = gconasih.codigo</on>
                                    <join table='gconasil'>
                                        <on>gconasih.codigo = gconasil.codigo</on>
                                    </join>
                                </join>
                            </join>
                        </join>
                    </from>
                    <where>
                        gconasil.cuenta IS NOT NULL
                        AND gcomfacl.linid = ?
                    </where>
                </select>
            `, pIntLinid);
            
        return mStrNumCuentaAsiento;
    }
    
    /**
     * INICIO DE LA TRANSACCIÓN
     */

    var mStrNumCuenta = null;
    
    /**
     * Búsqueda del numero de subcuenta de los datos contables asociado a la 
     * linea de la factura.
    */
    var mStrSubcuenta = Ax.db.executeGet(`
                <select first='1'>
                    <columns>
                        gcomfacl_datc.ctacon
                    </columns>
                    <from table='gcomfacl_datc' />
                    <where>
                        gcomfacl_datc.linid = ?
                        AND (gcomfacl_datc.import = ?
                            OR gcomfacl_datc.import = ?)
                    </where>
                </select>
            `, pIntLinid, pFloatDebe, pFloatHaber);
    
    /**
     * Si existe un numero de subcuenta se toma como cuenta para capuntes.
    */
    if (mStrSubcuenta != null) {
        
        mStrNumCuenta = mStrSubcuenta
    } else {
        
        /**
         * Se busca la cuenta del bien asociada a la familia del articulo de 
         * la linea de factura.
        */
        mStrNumCuenta = __getNumCuentaBien(pIntLinid);
        
        /**
         * Si no existe una cuenta, se hereda la del bien de la línea padre asociada.
        */
        if (mStrNumCuenta == null) {
            
            /**
             * Se obtiene el identificador de la línea padre asociada.
             */
            var mIntLinidPadre = Ax.db.executeGet(`
                <select first='1'>
                    <columns>
                        gcomfacl.auxnum2
                    </columns>
                    <from table='gcomfacl' />
                    <where>
                        gcomfacl.linid = ?
                    </where>
                </select>
            `, pIntLinid);
            
            mStrNumCuenta = __getNumCuentaBien(mIntLinidPadre);
            
            /**
             * Si no se encuentra una cuenta por el bien relacionado al articulo padre,
             * se toma la cuenta del asiento asociado a la tipologia de la factura
            */
            if (mStrNumCuenta == null) {
                
                mStrNumCuenta = __getNumCuentaAsiento(pIntLinid);
                
                /** 
                 * Si existe un número de cuenta, se completa para obtener un formato válido.
                */
                if (mStrNumCuenta != null) {
                    mStrNumCuenta = mStrNumCuenta + '.00000000';
                }
                
            }
        }
    }
    
    /**
     * En el caso de no haber encontrado ninguna cuenta, se retorna 
     * como null y heredara de la conseguida en el script (iges_con_contab)
     */
    return mStrNumCuenta;
}