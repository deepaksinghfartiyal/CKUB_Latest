using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using UBuilder.Domain;
using UBuilder.Domain.Repository;
using UBuilder.Domain.Results;
using UBuilder.Helper;
using System.Data;
using System.Data.OleDb;
using System.IO;
using System.Xml;
using System.Xml.Linq;
//using UBuilder.PricingLookup;


namespace UBuilder.Domain.EntityRepository
{
    public class PricingRepository : BaseRepository<Pricing>, IPricingRepository
    {
        public PricingRepository(IDatabaseFactory databaseFactory)
            : base(databaseFactory)
        {
        }


        
        public PriceObjOut GetPrice(string productCode, string userGUID)
        {
            string s = "";          
            PriceObjOut po = new PriceObjOut();
            po.ProductCode = productCode;
            com.cliffkeen.www.ItemPricing obj = new com.cliffkeen.www.ItemPricing();
           //com.ckatesting.ckstore.ItemPricing obj = new com.ckatesting.ckstore.ItemPricing();
            //WriteErrorLog(obj.Url);
            s = obj.InitializePrices(productCode, userGUID, "1");
            s = s.Substring(51, s.Length - 51);
            s = s.Replace("\n", "");          
            s = @"<?xml version='1.0'?>" + s;           
            XDocument doc = XDocument.Parse(s);

            var elements = doc.Root.DescendantsAndSelf().Elements().Where(d => d.Name.LocalName == "Quantity");
            foreach (var e in elements)
            {
                po.Quantity = int.Parse(e.Value);
            }
            elements = doc.Root.DescendantsAndSelf().Elements().Where(d => d.Name.LocalName == "TotalPrice");
            foreach (var e in elements)
            {
                po.TotalPrice = double.Parse(e.Value);
            }
            elements = doc.Root.DescendantsAndSelf().Elements().Where(d => d.Name.LocalName == "DiscountPrice");
            foreach (var e in elements)
            {
                po.DiscountPrice = double.Parse(e.Value);
            }
            elements = doc.Root.DescendantsAndSelf().Elements().Where(d => d.Name.LocalName == "UnitPrice");
            foreach (var e in elements)
            {
                po.UnitPrice = double.Parse(e.Value);
            }

            return po;

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
                    stwriter.WriteLine("pricing url==" + ex.ToString());
                    stwriter.WriteLine("-------------------End----------------------------");
                }
            }
            else
            {
                StreamWriter stwriter = System.IO.File.CreateText(path);
                stwriter.WriteLine("-------------------Error Log Start-----------as on " + DateTime.Now.ToString("hh:mm tt"));
                // stwriter.WriteLine("WebPage Name :" + webPageName);
                stwriter.WriteLine("pricing url=== " + ex.ToString());
                stwriter.WriteLine("-------------------End----------------------------");
                stwriter.Close();
            }
        }
    }
    public interface IPricingRepository : IRepository<Pricing>
    {
        PriceObjOut GetPrice(string productCode, string userGUID);
    }
}