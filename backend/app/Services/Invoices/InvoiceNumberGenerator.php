<?php

namespace App\Services\Invoices;

use Illuminate\Support\Str;

class InvoiceNumberGenerator
{
    public static function make(): string
    {
        $prefix = config('invoices.number_prefix', 'INV');
        $date = now()->format('Ymd');
        $random = Str::upper(Str::random(4));

        return sprintf('%s-%s-%s', $prefix, $date, $random);
    }
}
