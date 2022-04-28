using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
//using UBuilder.PricingLookup;
using System.Configuration;
using UBuilder.Domain.Results;
using UBuilder.Domain.EntityRepository;
using UBuilder.Helper;
using System.IO;

namespace UBuilder.Controllers
{
    [RoutePrefix("api/Pricing")]
    public class PricingController : ApiController
    {

        IPricingRepository _PricingRepository;
        IDesignsRepository _DesignsRepository;

       
        public PricingController(IPricingRepository PricingRepository)
        {
            _PricingRepository = PricingRepository;
            
        }

       
        
     
        [Route("PricingLookup")]
        [HttpPost]
        public IHttpActionResult PricingLookup(PriceLookupIn priceObj)
        {

            GetPricingOut result = new GetPricingOut();

            LoginHelper.CurrentUser cu = new LoginHelper.CurrentUser();
            LoginHelper.CurrentUser priorUser = new LoginHelper.CurrentUser();
 

            if (LoginHelper.UserStandard(ref cu))
            {
                if (LoginHelper.UserTempExists(ref priorUser))
                {
                   //AssignDesignToUser(priorUser.ID, cu.ID);
                }
            }
            else
            {
                LoginHelper.UserTemp(ref cu);
            }

            try
            {
                //WriteErrorLog(cu.userGUID);
                result.Data = _PricingRepository.GetPrice(priceObj.productId, cu.userGUID);
                result.Success = true;
                result.ErrorCode = string.Empty;
                result.ErrorText = string.Empty;

                return Ok(result);
            }
            catch (System.Exception ex)
            {
                result.Success = false;
                result.ErrorCode = "400";
                result.ErrorText = ex.Message;
                result.Data = null;
                return Ok(result);
            }
        }
        public void WriteErrorLog(string ex)
        {
            // string webPageName = Path.GetFileName(Request.Path);
            string errorLogFilename = "ErrorLog_" + DateTime.Now.ToString("dd-MM-yyyy") + ".txt";
            string path = System.Web.HttpContext.Current.Server.MapPath("~/Content/MyGoogleStorage/" + errorLogFilename);
            if (System.IO.File.Exists(path))
            {
                using (StreamWriter stwriter = new StreamWriter(path, true))
                {
                    stwriter.WriteLine("-------------------Error Log Start-----------as on " + DateTime.Now.ToString("hh:mm tt"));
                    // stwriter.WriteLine("WebPage Name :" + webPageName);
                    stwriter.WriteLine("Message:" + ex.ToString());
                    stwriter.WriteLine("-------------------End----------------------------");
                }
            }
            else
            {
                StreamWriter stwriter = System.IO.File.CreateText(path);
                stwriter.WriteLine("-------------------Error Log Start-----------as on " + DateTime.Now.ToString("hh:mm tt"));
                // stwriter.WriteLine("WebPage Name :" + webPageName);
                stwriter.WriteLine("Message: " + ex.ToString());
                stwriter.WriteLine("-------------------End----------------------------");
                stwriter.Close();
            }
        }

    }
}

    