namespace PocketWise.Application.Common;

public static class IpAddressHelper
{
    public static string? Mask(string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip)) return ip;
        ip = ip.Trim();

        // IPv4: 192.168.1.55 -> 192.168.1.***
        if (ip.Contains('.'))
        {
            var parts = ip.Split('.');
            if (parts.Length == 4)
            {
                return $"{parts[0]}.{parts[1]}.{parts[2]}.***";
            }
        }

        // IPv6: 2001:db8::1234 -> 2001:db8::****
        if (ip.Contains(':'))
        {
            var lastColon = ip.LastIndexOf(':');
            if (lastColon >= 0 && lastColon < ip.Length - 1)
            {
                return ip.Substring(0, lastColon + 1) + "****";
            }
        }

        return ip;
    }
}
