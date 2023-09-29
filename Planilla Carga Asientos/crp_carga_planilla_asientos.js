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
 *  -----------------------------------------------------------------------------
 *  JS: crp_carga_planilla_asientos
 *      Version:     V1.1
 *      Date:        25-09-2023
 *      Description: Creación de apuntes contables de forma masiva
 *                   a partir del procesamiento de archivo Excel.
 *  CALLED FROM:
 *  ==============
 *      OBJ:          cxls_apuntes_master [ACTION_91]
 *
 *  PARAMETERS:
 *  =============
 *
 *      @param   {Object}   pObjData      Objeto con información del formulario.
 *
 */
function crp_carga_planilla_asientos(pObjData) {

    /**
     * DEFINICIÓN DE VARIABLES
     */

    /**
     * mObjData {
     *      master_seqno        Identificador del archivo
     *      master_empcode      Código de la empresa
     *      master_sistem       Código del sistema
     *  }
     */
    var mObjData = Ax.util.js.object.assign({}, pObjData);

    var mIntFileId  = mObjData.master_seqno;
    var mStrEmpcode = mObjData.master_empcode;
    var mStrSistem  = mObjData.master_sistem;

    var mIntNumOrden = 1;
    var mStrMsgExcepcion = '';
    var mFloatSumDebe = 0;
    var mFloatSumHaber = 0;

    /**
     * Obtención de la data del fichero según su identificador.
     */
    var mFileData = Ax.db.executeGet(` 
        <select>
            <columns>
                cxls_apuntes_master.master_data
            </columns>
            <from table='cxls_apuntes_master'/>
            <where>
                cxls_apuntes_master.master_seqno  = ?
            </where>
        </select>
    `, mIntFileId);

    try {
        Ax.db.beginWork();

        /**
         * Transformación de la data del fichero a ResultSet para su manipulación.
         */
        var wb = Ax.ms.Excel.load(mFileData);
        var mXlsSheet = wb.getSheet(0);
        mXlsSheet.packRows();
        mXlsSheet.removeRow(0);
        var mRsSheet = mXlsSheet.toResultSet();

        /**
         * Insertar registro a la tabla cenllote para obtener el número de lote
         */
        var mIntLoteid = Ax.db.insert('cenllote', {tabname : 'cxls_apuntes_master'}).getSerial();

        /**
         * Recorrido de la información del archivo.
         */
        mRsSheet.forEach(mRowSheet => {
            /**
             * Se valida la existencia de data para campos requeridos
             */
            if (mRowSheet.E == null){
                mStrMsgExcepcion += `El campo 'Proyecto' [Columna E] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }
            if (mRowSheet.F == null){
                mStrMsgExcepcion += `El campo 'Sección' [Columna F] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }
            if (mRowSheet.C == null){
                mStrMsgExcepcion += `El campo 'Fecha' [Columna C] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }
            if (mRowSheet.A == null){
                mStrMsgExcepcion += `El campo 'Asiento' [Columna A] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }
            if (mRowSheet.G == null){
                mStrMsgExcepcion += `El campo 'Diario' [Columna G] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }
            if (mRowSheet.B == null){
                mStrMsgExcepcion += `El campo 'Documento' [Columna B] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }
            if (mRowSheet.H == null){
                mStrMsgExcepcion += `El campo 'Cuenta' [Columna H] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }
            if (mRowSheet.M == null){
                mStrMsgExcepcion += `El campo 'Divisa' [Columna M] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }
            if (mRowSheet.K == null){
                mStrMsgExcepcion += `El campo 'Debe' [Columna K] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }
            if (mRowSheet.L == null){
                mStrMsgExcepcion += `El campo 'Haber' [Columna L] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }
            if (mRowSheet.N == null){
                mStrMsgExcepcion += `El campo 'Cambio' [Columna N] debe estar informado en la fila [N° ${mIntNumOrden + 1}]` + '\n';
            }

            /**
             * Se ejecuta una alerta ante la ausencia de algún dato requerido.
             */
            if(mStrMsgExcepcion != '') {
                throw mStrMsgExcepcion;
            }

            mFloatSumDebe += mRowSheet.K;
            mFloatSumHaber += mRowSheet.L;

            /**
             * Se crea el apunte contable
             */
            Ax.db.insert("capuntes", {
                empcode         :   mStrEmpcode,                                // Código de Empresa
                proyec          :   mRowSheet.E,                                // Línea de negocio
                sistem          :   mStrSistem,                                 // Sistema
                seccio          :   mRowSheet.F,                                // Sección
                fecha           :   mRowSheet.C,                                // Fecha
                asient          :   mRowSheet.A,                                // Número de asiento
                diario          :   mRowSheet.G,                                // Código de diario
                orden           :   mIntNumOrden++,                             // Número de Orden
                jusser          :   'GL',                                       // Justificante
                origen          :   'E',                                        // Origen de apunte
                docser          :   mRowSheet.B,                                // Documento o número de factura
                punteo          :   'N',                                        // Apunte auditado
                placon          :   'PE',                                       // Plan contable
                cuenta          :   mRowSheet.H,                                // Cuenta contable
                codcon          :   mRowSheet.I,                                // Conceptos contables
                concep          :   mRowSheet.J,                                // Descripción del apunte
                fecval          :   mRowSheet.D,                                // Fecha de valor
                moneda          :   mRowSheet.M,                                // Moneda de transacción
                divdeb          :   mRowSheet.K,                                // Debe divisa
                divhab          :   mRowSheet.L,                                // Haber divisa
                cambio          :   mRowSheet.N,                                // Cambio
                divemp          :   'PEN',                                      // Moneda de la empresa
                debe            :   Ax.math.bc.mul(mRowSheet.K, mRowSheet.N),   // Debe
                haber           :   Ax.math.bc.mul(mRowSheet.L, mRowSheet.N),   // Haber
                loteid          :   mIntLoteid,                                 // Identificador de lote
                user_created    :   Ax.db.getUser(),
                user_updated    :   Ax.db.getUser()
            });

        });

        /**
         * Control de Debe y Haber registrados, el valor acumulado de ambos deben de ser iguales.
         */
        if(mFloatSumDebe != mFloatSumHaber){
            throw 'El acumulado de Debe y Haber deben de ser iguales en el archivo cargado.';
        }

        /**
         * Se actualiza el loteid generado y el estado del archivo.
         */
        Ax.db.update('cxls_apuntes_master',
            {
                master_loteid  : mIntLoteid,
                master_estado  : 'A'
            },
            {
                master_seqno: mIntFileId
            }
        );

        Ax.db.commitWork();
    } catch (e) {
        Ax.db.rollbackWork();

        console.error("Error:", e);
        throw new Ax.ext.Exception("Error: [${e}]",{e : e})
    }
}
