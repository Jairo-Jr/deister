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
 *  JS:  gcomfach_GenAssets_Services
 * 
 *  Version     : 1.3
 *  Date        : 03-05-2023
 *  Description : Script para construir un arreglo de objetos con información 
 *                de cabecera y lineas de factura de compras FMAN/FSER
 * 
 * 
 *  LOCAL FUNCTIONS:
 *  ==================
 *          __getDataHeader
 *          __getDataLines
 * 
 * 
 *  CALLED FROM:
 *  ==================
 * 
 * 
 *  PARAMETERS:
 *  ================== 
 *          @param      {integer}       pIntCabid         Identificador de la factura de compras
 * 
 * 
 **/

function gcomfach_GenAssets_Services(pIntCabid) {

    // ===============================================================
    // DECLARACIÓN DE FUNCIONES LOCALES
    // =============================================================== 

    /**
     * LOCAL FUNCTION: __getDataHeader
     *
     * Description: Función local que obtiene los datos de cabecera de la factura de compras
     *
     * PARAMETERS:
     *      @param      {integer}       pIntCabid         Identificador de la factura de compras 
     * 
     */
    function __getDataHeader(pIntCabid) {

        // ===============================================================
        // Obtener datos de gcomfach
        // ===============================================================
        var __mObjGcomfach = Ax.db.executeQuery(`
            <select>
                <columns>
                    gcomfach.cabid,
                    gcomfach.empcode,
                    gcomfach.docser,
                    gcomfach.fecha,
                    gcomfach.estcab,
                    gcomfach.date_contab,
                    gcomfach.tercer,
                    gcomfach.dtogen,
                    gcomfach.codpre,
                    gcomfach.codpar,
                    gcomfach.tipdoc,
                    gcomfach.delega,
                    gcomfach.depart,
                    gcomfach.tipdir,
                    gcomfach.refter,
                    gcomfach.dockey,
                    gcomfach.divisa,
                    gcomfach.cambio,
                    gcomfach.impfac,
                    gdeparta.proyec  gdeparta_proyec,
                    gdeparta.seccio  gdeparta_seccio,
                    gdeparta.ctaexp  gdeparta_ctaexp,
                    gdeparta.centro  gdeparta_centro
                </columns>
                <from table='gcomfach'>
                    <join type='left' table='gdeparta'>
                        <on>gcomfach.delega = gdeparta.delega</on>
                        <on>gcomfach.depart = gdeparta.depart</on>
                    </join>
                </from>
                <where>
                    gcomfach.cabid = ?
                </where>
            </select>
        `, pIntCabid).toOne().setRequired(`gcomfach.cabid = ${pIntCabid} not found`);

        return __mObjGcomfach;
    } 

    /**
     * LOCAL FUNCTION: __getDataLines
     *
     * Description: Función local que obtiene los datos de linea de la factura de compras
     *
     * PARAMETERS:
     *      @param      {integer}       pIntCabid         Identificador de la factura de compras 
     * 
     */
    function __getDataLines(pIntCabid) { 

        // ===============================================================
        // Variables locales
        // ===============================================================
        var _mArrLines = [];
        var _mIntPorcent = 0;
        var _mArrErrorLines = [];
        var _mArrCompAsignados;
        
        // ===============================================================
        // Obtener datos de gcomfacl
        // ===============================================================
        var _mArrGcomfacl = Ax.db.executeQuery(`
            <select>
                <columns>
                    gcomfacl.linid, 
                    gcomfacl.codart,
                    gcomfacl.varlog,
                    gcomfacl.canfac,
                    gcomfacl.impnet,
                    gcomfacl.desvar,
                    gcomfacl.orden,
                    gcomfacl.auxnum1,
                    garticul.nomart garticul_nomart,
                    gartfami.agrele gartfami_agrele,
                    gartfami.codinm gartfami_codinm, 
                    gartfami.serele gartfami_serele,
                    gartfami.codcta gartfami_codcta,
                    gartfami.codgru gartfami_codgru, 
                    gartfami.codfis gartfami_codfis,
                    gartfami.sisamo gartfami_sisamo
                </columns>
                <from table='gcomfacl'>
                    <join table='garticul'>
                        <on>gcomfacl.codart = garticul.codigo</on>
                    </join>
                    <join table='gartfami'>
                        <on>garticul.codfam = gartfami.codigo</on>
                    </join>
                </from>
                <where>
                    gcomfacl.cabid = ?
                </where>
            </select>
        `, pIntCabid).toJSONArray();

        _mArrGcomfacl.forEach(_mObjGcomfacl => { 

            // ===============================================================
            // Si no fue generado su componente asignado
            // ===============================================================
            if (_mObjGcomfacl.auxnum1 != 1) { 

                // ===============================================================
                // Obtener los componentes asignados a la linea
                // ===============================================================
                _mArrCompAsignados = Ax.db.executeQuery(`
                    <select>
                        <columns>
                            id_cinmcomp,
                            porcen
                        </columns>
                        <from table='gcomfacl_dist_cinmcomp'/>
                        <where>
                            linid = ?
                        </where>
                    </select>
                `, _mObjGcomfacl.linid).toJSONArray(); 

                // ===============================================================
                // Si existe registro de componentes asignados a la linea
                // ===============================================================
                if (_mArrCompAsignados.length > 0) {
                    _mIntPorcent = 0;

                    // Recorrido de componentes asignados a la linea
                    _mArrCompAsignados.forEach(_mObjCompAsig => {
                        _mIntPorcent += _mObjCompAsig.porcen

                        // ===============================================================
                        // Si el porcentaje total supera el 100%, se almacena 
                        // el identificador de la linea
                        // ===============================================================
                        if (_mIntPorcent > 100) {
                            _mArrErrorLines.push(_mObjGcomfacl.linid)
                        }
                    })

                    // ===============================================================
                    // Registro del objeto con datos de la linea en el arreglo
                    // ===============================================================
                    _mArrLines.push(_mObjGcomfacl);
                }
            }
        });
        
        // ===============================================================
        // Si existe registro de lineas que superan el 100% en sus 
        // componentes asignados, se lanza un error para informar 
        // que sean corregidos.
        // ===============================================================
        if (_mArrErrorLines.length > 0) {
            throw `Las líneas superan el 100% para sus componentes asignados: [${_mArrErrorLines}].`;
        }

        return _mArrLines;
    } 

    // ===============================================================
    // DECLARACIÓN DE VARIABLES GLOBALES
    // =============================================================== 
    var mArrAssetSrc = [];
    var mIntExistDatCont = 0; 
    var mObjGcomfach;
    var mArrDataLines;
    var mIntCountExistDatc;

    // ===============================================================
    // INICIO DE LA TRANSACCIÓN
    // =============================================================== 

    // ===============================================================
    // Se obtienen datos de la cabecera según el identificador 
    // de la factura de compras.
    // ===============================================================
    mObjGcomfach = __getDataHeader(pIntCabid);

    // ===============================================================
    // Se obtienen datos de las lineas asociadas al identificador 
    // de la factura de compras.
    // ===============================================================
    mArrDataLines = __getDataLines(pIntCabid); 

    // ===============================================================
    // Si existen lineas registradas en el arreglo
    // ===============================================================
    if (mArrDataLines.length > 0) { 

        // ===============================================================
        // Recorrido de lineas registradas
        // ===============================================================
        mArrDataLines.forEach(mRowGcomfacl => {
            mIntExistDatCont = 0;

            // ===============================================================
            // Se omite en caso de ser una línea por redondeo
            // ===============================================================
            if (mRowGcomfacl.orden == -999) {
                return;
            }

            // ===============================================================
            // Validar si existen datos contables asociados a las líneas
            // ===============================================================
            mIntCountExistDatc = Ax.db.executeGet(`
                    SELECT COUNT(*)
                    FROM gcomfacl_datc
                    WHERE gcomfacl_datc.linid = ?
                `, mRowGcomfacl.linid);

            if (mIntCountExistDatc > 0) {
                mIntExistDatCont = 1
            }

            // ===============================================================
            // Creación de arreglo de objetos con data de cabecera y linea
            // ===============================================================
            mArrAssetSrc.push({
                empcode         :   mObjGcomfach.empcode,
                tipdoc          :   mObjGcomfach.tipdoc,
                delega          :   mObjGcomfach.delega,
                depart          :   mObjGcomfach.depart,
                fecha           :   mObjGcomfach.fecha,
                tercer          :   mObjGcomfach.tercer,
                tipdir          :   mObjGcomfach.tipdir,
                terenv          :   mObjGcomfach.tercer,
                direnv          :   mObjGcomfach.tipdir,
                docser          :   mObjGcomfach.docser,
                refter          :   mObjGcomfach.refter,
                dtogen          :   mObjGcomfach.dtogen,
                codpre          :   mObjGcomfach.codpre,
                codpar          :   mObjGcomfach.codpar,
                dockey          :   mObjGcomfach.dockey,

                divisa          :   mObjGcomfach.divisa,
                cambio          :   mObjGcomfach.cambio,
                impfac          :   mObjGcomfach.impfac,

                gdeparta_proyec :   mObjGcomfach.gdeparta_proyec,
                gdeparta_seccio :   mObjGcomfach.gdeparta_seccio,
                gdeparta_ctaexp :   mObjGcomfach.gdeparta_ctaexp,
                gdeparta_centro :   mObjGcomfach.gdeparta_centro,

                docid           :   mRowGcomfacl.linid,
                codart          :   mRowGcomfacl.codart,
                varlog          :   mRowGcomfacl.varlog,
                canmov          :   mRowGcomfacl.canfac,
                impnet          :   mRowGcomfacl.impnet,
                desvar          :   mRowGcomfacl.desvar || mRowGcomfacl.garticul_nomart,
                exist_datc      :   mIntExistDatCont != 0 ? mIntExistDatCont : mRowGcomfacl.exist_datc,
                gartfami_codinm :   mRowGcomfacl.gartfami_codinm,
                gartfami_serele :   mRowGcomfacl.gartfami_serele,
                gartfami_agrele :   mRowGcomfacl.gartfami_agrele,
                gartfami_codcta :   mRowGcomfacl.gartfami_codcta,
                gartfami_codgru :   mRowGcomfacl.gartfami_codgru,
                gartfami_codfis :   mRowGcomfacl.gartfami_codfis,
                gartfami_sisamo :   mRowGcomfacl.gartfami_sisamo
            });
        }); 

        // ===============================================================
        // Si se registraron objetos en el arreglo, se realiza call 
        // para generar generar componentes.
        // ===============================================================
        if (mArrAssetSrc.length > 0) { 
            
            Ax.db.call("gdoc_GenAssets_Services", pIntCabid, mArrAssetSrc); 
        }
    } 
}