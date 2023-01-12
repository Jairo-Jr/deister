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
 *  -----------------------------------------------------------------------------
 *  JS: crp_load_gtin_file
 *      Version:    V1.0
 *      Date:       2022.10.07
 *      Description: Carga fichero xls GTIN SuSalud en la tabla de registros
 *                   de códigos GTIN SUSALUD(crp_sstd_gtin)
 *
 *      CALLED FROM:
 *      ==============
 * 
 *      OBJ : sstd_gtin
 * 
 *      PARAMETERS:
 *      =============
 * 
 *      @param   {interger}   pIntFileId      Identificador de fichero.
 *  
 */

 function crp_load_gtin_file(pIntFileId) {

    /**
     * Validación: Fichero cargado previamente.
     */
    var mIntExistFileLoad = Ax.db.executeGet(`
        <select>
            <columns>
                COUNT(*)
            </columns>
            <from table='crp_sstd_gtin'/>
            <where>
                crp_sstd_gtin.file_seqno = ?
            </where>
        </select> 
    `, pIntFileId);

    if (mIntExistFileLoad > 1){
        throw new Ax.ext.Exception("El fichero con Id. [${fileId}] se encuentra cargado en SSTD GTIN.",{fileId : pIntFileId});
    }

    /**
     * Se obtiene el fichero a cargar.
     */
     var mObjGtinSuSalud = Ax.db.executeQuery(`
        <select first='1'>
            <columns>
                sstd_gtin.file_seqno,
                sstd_gtin.file_name,
                sstd_gtin.file_data,
                sstd_gtin.file_status,
                sstd_gtin.date_created
            </columns>
            <from table='sstd_gtin'/>
            <where>
            		sstd_gtin.file_seqno  = ?
            	AND sstd_gtin.file_status = 'P'
            </where>
        </select>
    `,pIntFileId).toOne();

    try{
        var wb = Ax.ms.Excel.load(mObjGtinSuSalud.file_data);
    } catch(e){
        throw new Ax.ext.Exception("El documento NO presenta el formato de excel")
    }

    /**
     * Definición de variables
     */    
    var mXlsSheet          = wb.getSheet(0);
    mXlsSheet.removeRow(0);
    var mIntStartRowhHeader = 1;
    var mIntLastRow         = mXlsSheet.getLastRowNum();

    /**
     * Validación: Existencia de data a cargar
     */    
    if (mIntLastRow < mIntStartRowhHeader){
        throw new Ax.ext.Exception("No existen registros a cargar en la hoja de Excel"); 
    }

    let mRsSheet          = mXlsSheet.toResultSet();
    var mArrData          = [];
    var mObjTransicion    = {};
    var mArrNroRegistro   = [];

    /**
     * Se recorre el excel
     */    
     try {

        Ax.db.beginWork();

        /**
         * Antes de cargar el excel se debe vacear la
         * tabla de"Registros de códigos GTIN SuSalud"
         */    
        Ax.db.execute(`DELETE FROM crp_sstd_gtin WHERE 1=1 `);

        for(let mRowSheet of mRsSheet){

            mRowSheet.gtin_code   =  mRowSheet.A,  delete mRowSheet.A;
            mRowSheet.gtin_type   =  mRowSheet.B,  delete mRowSheet.B;
            mRowSheet.gtin_prod   =  mRowSheet.C,  delete mRowSheet.C;
            mRowSheet.gtin_name   =  mRowSheet.D,  delete mRowSheet.D;
            mRowSheet.gtin_common =  mRowSheet.E,  delete mRowSheet.E;
            mRowSheet.gtin_concen =  mRowSheet.F,  delete mRowSheet.F;
            mRowSheet.gtin_forma  =  mRowSheet.G,  delete mRowSheet.G;
            mRowSheet.gtin_forsi  =  mRowSheet.H,  delete mRowSheet.H;
            mRowSheet.gtin_labor  =  mRowSheet.I,  delete mRowSheet.I;
            mRowSheet.gtin_pais   =  mRowSheet.J,  delete mRowSheet.J;
            mRowSheet.gtin_pres   =  mRowSheet.K,  delete mRowSheet.K;
            mRowSheet.gtin_unid   =  mRowSheet.L,  delete mRowSheet.L;
            mRowSheet.gtin_estado =  mRowSheet.M,  delete mRowSheet.M;
            mRowSheet.gtin_nrgs   =  mRowSheet.N,  delete mRowSheet.N;
            mRowSheet.file_seqno  =  pIntFileId;
            delete mRowSheet.Row;
            
            mObjTransicion = mRowSheet;
        
            /**
             * Registros con más de un número de registro sanitario
             */  
            if (mObjTransicion.gtin_nrgs.search(",")!=-1){
                
                var mArrCodigo = mObjTransicion.gtin_nrgs.split(",");
                
                for(let i =0; i< mArrCodigo.length; i++){
                    mObjTransicion.gtin_nrgs = mArrCodigo[i].trim();
                    Ax.db.insert("crp_sstd_gtin",mObjTransicion);
                }
            }else{
                /**
                 * Registros con un número de registro sanitario
                 */  
                Ax.db.insert("crp_sstd_gtin",mObjTransicion);
            }
        }

        var mIntCount = Ax.db.executeGet(`SELECT COUNT(*) FROM crp_sstd_gtin`);
        
        /**
         * Actualizar tabla GTIN SuSalud
         * con estado = C
         */    
        Ax.db.update("sstd_gtin", 
        	{
	            file_status  : 'C',
	            user_updated : Ax.db.getUser(),
	            date_updated : new Ax.util.Date()
	    	},
	    	{
	    		file_seqno : pIntFileId
	    	}
	    );

        Ax.db.commitWork();
        
        return mIntCount;
        
    } catch(error){

        Ax.db.rollbackWork();

        Ax.db.update("sstd_gtin", 
        	{
	            file_status  : 'E',
	            user_updated : Ax.db.getUser(),
	            date_updated : new Ax.util.Date()
	    	},
	    	{
	    		file_seqno : pIntFileId
	    	}
	    );
    }

 }